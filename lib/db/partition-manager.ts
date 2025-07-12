import { createClient } from '@/lib/supabase/admin'
import { Queue } from 'bullmq'
import { redisClients } from '@/lib/cache/redis-sentinel'

interface PartitionInfo {
  tableName: string
  partitionCount: number
  oldestPartition: Date
  newestPartition: Date
  totalSize: string
}

interface PartitionStats {
  partitionName: string
  startDate: Date
  endDate: Date
  size: string
  rowCount: number
  lastVacuum?: Date
  deadTuples: number
}

export class PartitionManager {
  private static instance: PartitionManager
  private supabase = createClient()
  private maintenanceQueue: Queue

  private constructor() {
    this.maintenanceQueue = new Queue('partition-maintenance', {
      connection: redisClients.queue,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    })

    this.setupMaintenanceJobs()
  }

  static getInstance(): PartitionManager {
    if (!PartitionManager.instance) {
      PartitionManager.instance = new PartitionManager()
    }
    return PartitionManager.instance
  }

  /**
   * Get partition information for all partitioned tables
   */
  async getPartitionInfo(): Promise<PartitionInfo[]> {
    const { data, error } = await this.supabase
      .rpc('get_partition_info')

    if (error) {
      console.error('Error fetching partition info:', error)
      return []
    }

    return data as PartitionInfo[]
  }

  /**
   * Get detailed stats for a specific table's partitions
   */
  async getPartitionStats(tableName: string): Promise<PartitionStats[]> {
    const { data, error } = await this.supabase
      .from('partition_sizes')
      .select('*')
      .eq('parent_table', tableName)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('Error fetching partition stats:', error)
      return []
    }

    return data as PartitionStats[]
  }

  /**
   * Create new partitions ahead of time
   */
  async createFuturePartitions(tableName: string, count: number = 3): Promise<void> {
    try {
      await this.supabase.rpc('partman.create_partition', {
        p_parent_table: tableName,
        p_partition_times: Array(count).fill(null).map((_, i) => {
          const date = new Date()
          date.setMonth(date.getMonth() + i + 1)
          return date.toISOString()
        })
      })

      console.log(`Created ${count} future partitions for ${tableName}`)
    } catch (error) {
      console.error(`Error creating partitions for ${tableName}:`, error)
      throw error
    }
  }

  /**
   * Check partition health and performance
   */
  async checkPartitionHealth(): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    const issues: string[] = []
    const recommendations: string[] = []

    try {
      // Check partition counts
      const info = await this.getPartitionInfo()
      
      for (const table of info) {
        // Check if we have enough future partitions
        const monthsAhead = this.getMonthsDifference(new Date(), table.newestPartition)
        if (monthsAhead < 3) {
          issues.push(`Table ${table.tableName} has less than 3 months of future partitions`)
          recommendations.push(`Create more partitions for ${table.tableName}`)
        }

        // Check for very old partitions that should be archived
        const monthsOld = this.getMonthsDifference(table.oldestPartition, new Date())
        if (monthsOld > 24) {
          recommendations.push(`Archive old partitions for ${table.tableName} (older than 2 years)`)
        }
      }

      // Check partition performance
      const { data: perfData } = await this.supabase
        .from('partition_performance')
        .select('*')
        .gt('dead_tuples', 10000)

      if (perfData && perfData.length > 0) {
        issues.push(`${perfData.length} partitions have high dead tuple count`)
        recommendations.push('Run VACUUM on partitions with high dead tuples')
      }

      // Check for missing partitions
      const missingPartitions = await this.checkMissingPartitions()
      if (missingPartitions.length > 0) {
        issues.push(`Missing partitions detected: ${missingPartitions.join(', ')}`)
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
      }
    } catch (error) {
      console.error('Error checking partition health:', error)
      return {
        healthy: false,
        issues: ['Failed to check partition health'],
        recommendations: [],
      }
    }
  }

  /**
   * Archive old partitions to cold storage
   */
  async archiveOldPartitions(tableName: string, olderThanMonths: number = 24): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setMonth(cutoffDate.getMonth() - olderThanMonths)

    const stats = await this.getPartitionStats(tableName)
    const toArchive = stats.filter(s => s.endDate < cutoffDate)

    for (const partition of toArchive) {
      await this.maintenanceQueue.add('archive-partition', {
        tableName,
        partitionName: partition.partitionName,
        stats: partition,
      })
    }

    console.log(`Queued ${toArchive.length} partitions for archival`)
  }

  /**
   * Optimize partition by running VACUUM and ANALYZE
   */
  async optimizePartition(partitionName: string): Promise<void> {
    try {
      // Run VACUUM ANALYZE
      await this.supabase.rpc('run_vacuum_analyze', {
        table_name: partitionName
      })

      // Update stats cache
      await this.updatePartitionStatsCache(partitionName)

      console.log(`Optimized partition ${partitionName}`)
    } catch (error) {
      console.error(`Error optimizing partition ${partitionName}:`, error)
      throw error
    }
  }

  /**
   * Get query performance stats for partitioned tables
   */
  async getQueryPerformance(tableName: string): Promise<{
    avgQueryTime: number
    partitionPruningRate: number
    hotPartitions: string[]
  }> {
    // This would analyze pg_stat_statements and query plans
    // For now, return mock data
    return {
      avgQueryTime: 45, // ms
      partitionPruningRate: 0.92, // 92% of queries use partition pruning
      hotPartitions: [`${tableName}_p${new Date().getFullYear()}_${new Date().getMonth() + 1}`],
    }
  }

  /**
   * Setup automatic maintenance jobs
   */
  private setupMaintenanceJobs(): void {
    // Daily partition maintenance
    this.maintenanceQueue.add(
      'daily-maintenance',
      {},
      {
        repeat: {
          pattern: '0 2 * * *', // 2 AM daily
        },
      }
    )

    // Weekly health check
    this.maintenanceQueue.add(
      'weekly-health-check',
      {},
      {
        repeat: {
          pattern: '0 3 * * 0', // 3 AM Sunday
        },
      }
    )

    // Process maintenance jobs
    this.maintenanceQueue.process('daily-maintenance', async () => {
      await this.runDailyMaintenance()
    })

    this.maintenanceQueue.process('weekly-health-check', async () => {
      const health = await this.checkPartitionHealth()
      if (!health.healthy) {
        console.error('Partition health issues:', health.issues)
        // Send alerts
      }
    })

    this.maintenanceQueue.process('archive-partition', async (job) => {
      const { tableName, partitionName, stats } = job.data
      await this.archivePartition(tableName, partitionName, stats)
    })
  }

  /**
   * Run daily maintenance tasks
   */
  private async runDailyMaintenance(): Promise<void> {
    console.log('Running daily partition maintenance...')

    try {
      // Run partman maintenance
      await this.supabase.rpc('partman.run_maintenance')

      // Create future partitions if needed
      const info = await this.getPartitionInfo()
      for (const table of info) {
        const monthsAhead = this.getMonthsDifference(new Date(), table.newestPartition)
        if (monthsAhead < 6) {
          await this.createFuturePartitions(table.tableName, 6 - monthsAhead)
        }
      }

      // Optimize hot partitions
      await this.optimizeHotPartitions()

      console.log('Daily partition maintenance completed')
    } catch (error) {
      console.error('Error in daily maintenance:', error)
      throw error
    }
  }

  /**
   * Archive a specific partition
   */
  private async archivePartition(
    tableName: string,
    partitionName: string,
    stats: PartitionStats
  ): Promise<void> {
    console.log(`Archiving partition ${partitionName}...`)

    try {
      // In a real implementation, this would:
      // 1. Create a backup of the partition data
      // 2. Upload to S3 or other cold storage
      // 3. Verify the backup
      // 4. Drop the partition

      await this.supabase.rpc('archive_old_partition', {
        p_table_name: tableName,
        p_partition_name: partitionName,
      })

      // Clear related caches
      await redisClients.cache.del(`partition:stats:${partitionName}`)

      console.log(`Successfully archived partition ${partitionName}`)
    } catch (error) {
      console.error(`Error archiving partition ${partitionName}:`, error)
      throw error
    }
  }

  /**
   * Optimize frequently accessed partitions
   */
  private async optimizeHotPartitions(): Promise<void> {
    // Get current month's partitions (most likely to be hot)
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    const tables = ['meetings', 'transcriptions', 'analytics_events']
    
    for (const table of tables) {
      const partitionName = `${table}_p${currentMonth.replace('-', '_')}`
      
      try {
        // Check if optimization is needed
        const { data: stats } = await this.supabase
          .from('partition_performance')
          .select('dead_tuples, last_autovacuum')
          .eq('tablename', partitionName)
          .single()

        if (stats && (stats.dead_tuples > 5000 || this.daysSince(stats.last_autovacuum) > 7)) {
          await this.optimizePartition(partitionName)
        }
      } catch (error) {
        console.error(`Error checking partition ${partitionName}:`, error)
      }
    }
  }

  /**
   * Check for missing partitions
   */
  private async checkMissingPartitions(): Promise<string[]> {
    const missing: string[] = []
    
    // Check for gaps in partition sequences
    const tables = ['meetings', 'transcriptions', 'meeting_segments']
    
    for (const table of tables) {
      const stats = await this.getPartitionStats(table)
      
      // Sort by date and check for gaps
      stats.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      
      for (let i = 1; i < stats.length; i++) {
        const prevEnd = stats[i - 1].endDate
        const currentStart = stats[i].startDate
        
        if (prevEnd < currentStart) {
          missing.push(`${table} between ${prevEnd.toISOString()} and ${currentStart.toISOString()}`)
        }
      }
    }
    
    return missing
  }

  /**
   * Update partition stats cache
   */
  private async updatePartitionStatsCache(partitionName: string): Promise<void> {
    const { data: stats } = await this.supabase
      .from('partition_performance')
      .select('*')
      .eq('tablename', partitionName)
      .single()

    if (stats) {
      await redisClients.cache.setex(
        `partition:stats:${partitionName}`,
        3600, // 1 hour cache
        JSON.stringify(stats)
      )
    }
  }

  /**
   * Calculate months difference between dates
   */
  private getMonthsDifference(date1: Date, date2: Date): number {
    const months = (date2.getFullYear() - date1.getFullYear()) * 12
    return months + date2.getMonth() - date1.getMonth()
  }

  /**
   * Calculate days since a date
   */
  private daysSince(date: Date | string | null): number {
    if (!date) return Infinity
    const d = typeof date === 'string' ? new Date(date) : date
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  }
}

// Export singleton instance
export const partitionManager = PartitionManager.getInstance()