import { PartitionManager } from '@/lib/db/partition-manager'
import { createClient } from '@/lib/supabase/admin'
import { redisClients } from '@/lib/cache/redis-sentinel'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/cache/redis-sentinel')
jest.mock('bullmq')

describe('PartitionManager', () => {
  let partitionManager: PartitionManager
  const mockSupabase = {
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    partitionManager = PartitionManager.getInstance()
  })

  describe('getPartitionInfo', () => {
    it('should return partition information for all tables', async () => {
      const mockPartitionInfo = [
        {
          table_name: 'meetings',
          partition_count: 15,
          oldest_partition: new Date('2023-01-01'),
          newest_partition: new Date('2024-03-01'),
          total_size: '1.2 GB',
        },
        {
          table_name: 'transcriptions',
          partition_count: 15,
          oldest_partition: new Date('2023-01-01'),
          newest_partition: new Date('2024-03-01'),
          total_size: '800 MB',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockPartitionInfo, error: null })

      const result = await partitionManager.getPartitionInfo()

      expect(result).toEqual(mockPartitionInfo)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_partition_info')
    })

    it('should handle errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: 'Database error' })
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const result = await partitionManager.getPartitionInfo()

      expect(result).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching partition info:',
        'Database error'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getPartitionStats', () => {
    it('should return detailed stats for a specific table', async () => {
      const mockStats = [
        {
          partition_name: 'meetings_p2024_01',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-02-01'),
          size: '100 MB',
          row_count: 5000,
          last_vacuum: new Date('2024-01-15'),
          dead_tuples: 100,
        },
      ]

      mockSupabase.order.mockResolvedValue({ data: mockStats, error: null })

      const result = await partitionManager.getPartitionStats('meetings')

      expect(result).toEqual(mockStats)
      expect(mockSupabase.from).toHaveBeenCalledWith('partition_sizes')
      expect(mockSupabase.eq).toHaveBeenCalledWith('parent_table', 'meetings')
    })
  })

  describe('checkPartitionHealth', () => {
    it('should identify health issues and provide recommendations', async () => {
      const mockPartitionInfo = [
        {
          table_name: 'meetings',
          partition_count: 10,
          oldest_partition: new Date('2021-01-01'), // Very old
          newest_partition: new Date(), // Current month
          total_size: '5 GB',
        },
      ]

      const mockPerfData = [
        {
          tablename: 'meetings_p2024_01',
          dead_tuples: 15000, // High dead tuples
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockPartitionInfo, error: null })
      mockSupabase.gt.mockReturnThis()
      mockSupabase.select.mockResolvedValue({ data: mockPerfData, error: null })

      const health = await partitionManager.checkPartitionHealth()

      expect(health.healthy).toBe(false)
      expect(health.issues).toContain('Table meetings has less than 3 months of future partitions')
      expect(health.issues).toContain('1 partitions have high dead tuple count')
      expect(health.recommendations).toContain('Archive old partitions for meetings (older than 2 years)')
      expect(health.recommendations).toContain('Run VACUUM on partitions with high dead tuples')
    })

    it('should report healthy when no issues found', async () => {
      const mockPartitionInfo = [
        {
          table_name: 'meetings',
          partition_count: 15,
          oldest_partition: new Date('2023-01-01'),
          newest_partition: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months ahead
          total_size: '1 GB',
        },
      ]

      mockSupabase.rpc.mockResolvedValue({ data: mockPartitionInfo, error: null })
      mockSupabase.gt.mockReturnThis()
      mockSupabase.select.mockResolvedValue({ data: [], error: null })

      const health = await partitionManager.checkPartitionHealth()

      expect(health.healthy).toBe(true)
      expect(health.issues).toHaveLength(0)
    })
  })

  describe('createFuturePartitions', () => {
    it('should create specified number of future partitions', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })

      await partitionManager.createFuturePartitions('meetings', 3)

      expect(mockSupabase.rpc).toHaveBeenCalledWith('partman.create_partition', {
        p_parent_table: 'meetings',
        p_partition_times: expect.arrayContaining([
          expect.stringContaining('T'),
          expect.stringContaining('T'),
          expect.stringContaining('T'),
        ]),
      })
    })

    it('should throw error on failure', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Database error'))

      await expect(
        partitionManager.createFuturePartitions('meetings', 3)
      ).rejects.toThrow('Database error')
    })
  })

  describe('archiveOldPartitions', () => {
    it('should queue old partitions for archival', async () => {
      const mockStats = [
        {
          partition_name: 'meetings_p2021_01',
          start_date: new Date('2021-01-01'),
          end_date: new Date('2021-02-01'),
          size: '50 MB',
          row_count: 1000,
        },
        {
          partition_name: 'meetings_p2024_01',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-02-01'),
          size: '100 MB',
          row_count: 5000,
        },
      ]

      jest.spyOn(partitionManager, 'getPartitionStats').mockResolvedValue(mockStats as any)
      const addSpy = jest.spyOn(partitionManager['maintenanceQueue'], 'add')

      await partitionManager.archiveOldPartitions('meetings', 24)

      expect(addSpy).toHaveBeenCalledWith('archive-partition', {
        tableName: 'meetings',
        partitionName: 'meetings_p2021_01',
        stats: mockStats[0],
      })
      expect(addSpy).toHaveBeenCalledTimes(1) // Only the old partition
    })
  })

  describe('optimizePartition', () => {
    it('should run vacuum analyze on partition', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null })
      ;(redisClients.cache.setex as jest.Mock).mockResolvedValue('OK')
      
      mockSupabase.single.mockResolvedValue({
        data: { tablename: 'meetings_p2024_01', dead_tuples: 100 },
        error: null,
      })

      await partitionManager.optimizePartition('meetings_p2024_01')

      expect(mockSupabase.rpc).toHaveBeenCalledWith('run_vacuum_analyze', {
        table_name: 'meetings_p2024_01',
      })
      expect(redisClients.cache.setex).toHaveBeenCalled()
    })
  })

  describe('getQueryPerformance', () => {
    it('should return query performance metrics', async () => {
      const result = await partitionManager.getQueryPerformance('meetings')

      expect(result).toEqual({
        avgQueryTime: 45,
        partitionPruningRate: 0.92,
        hotPartitions: expect.arrayContaining([expect.stringContaining('meetings_p')]),
      })
    })
  })
})