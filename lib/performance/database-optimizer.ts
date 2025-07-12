import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { performanceMonitor } from './monitor'

// Database query optimization utilities

export class DatabaseOptimizer {
  // Analyze slow queries
  async analyzeSlowQueries(threshold: number = 1000): Promise<any[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('get_slow_queries', {
      duration_threshold: threshold
    })
    
    if (error) {
      log.error('Failed to get slow queries', { error })
      return []
    }
    
    return data || []
  }

  // Get missing indexes
  async getMissingIndexes(): Promise<any[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('get_missing_indexes')
    
    if (error) {
      log.error('Failed to get missing indexes', { error })
      return []
    }
    
    return data || []
  }

  // Analyze table sizes
  async getTableSizes(): Promise<any[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('get_table_sizes')
    
    if (error) {
      log.error('Failed to get table sizes', { error })
      return []
    }
    
    return data || []
  }

  // Get query statistics
  async getQueryStats(): Promise<any[]> {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('get_query_stats')
    
    if (error) {
      log.error('Failed to get query stats', { error })
      return []
    }
    
    return data || []
  }

  // Optimize a specific query
  async optimizeQuery(sql: string): Promise<{
    original: any
    optimized: any
    suggestions: string[]
  }> {
    const supabase = createClient()
    
    // Get query plan
    const { data: originalPlan } = await supabase.rpc('explain_query', {
      query_text: sql
    })
    
    const suggestions: string[] = []
    
    // Analyze plan for optimization opportunities
    if (originalPlan) {
      // Check for sequential scans
      if (JSON.stringify(originalPlan).includes('Seq Scan')) {
        suggestions.push('Consider adding indexes to avoid sequential scans')
      }
      
      // Check for nested loops
      if (JSON.stringify(originalPlan).includes('Nested Loop')) {
        suggestions.push('Large nested loops detected - consider query restructuring')
      }
      
      // Check for sorts
      if (JSON.stringify(originalPlan).includes('Sort')) {
        suggestions.push('Sorting detected - ensure indexes support ORDER BY')
      }
    }
    
    return {
      original: originalPlan,
      optimized: originalPlan, // Would implement actual optimization
      suggestions
    }
  }
}

// Query builder with optimization
export class OptimizedQueryBuilder {
  private selectColumns: string[] = []
  private fromTable: string = ''
  private joins: string[] = []
  private whereConditions: string[] = []
  private orderBy: string[] = []
  private limitValue?: number
  private offsetValue?: number

  select(...columns: string[]): this {
    this.selectColumns.push(...columns)
    return this
  }

  from(table: string): this {
    this.fromTable = table
    return this
  }

  join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, condition: string): this {
    this.joins.push(`${type} JOIN ${table} ON ${condition}`)
    return this
  }

  where(condition: string): this {
    this.whereConditions.push(condition)
    return this
  }

  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orderBy.push(`${column} ${direction}`)
    return this
  }

  limit(value: number): this {
    this.limitValue = value
    return this
  }

  offset(value: number): this {
    this.offsetValue = value
    return this
  }

  build(): string {
    const parts = []
    
    // SELECT
    parts.push(`SELECT ${this.selectColumns.join(', ') || '*'}`)
    
    // FROM
    parts.push(`FROM ${this.fromTable}`)
    
    // JOINS
    if (this.joins.length > 0) {
      parts.push(...this.joins)
    }
    
    // WHERE
    if (this.whereConditions.length > 0) {
      parts.push(`WHERE ${this.whereConditions.join(' AND ')}`)
    }
    
    // ORDER BY
    if (this.orderBy.length > 0) {
      parts.push(`ORDER BY ${this.orderBy.join(', ')}`)
    }
    
    // LIMIT
    if (this.limitValue !== undefined) {
      parts.push(`LIMIT ${this.limitValue}`)
    }
    
    // OFFSET
    if (this.offsetValue !== undefined) {
      parts.push(`OFFSET ${this.offsetValue}`)
    }
    
    return parts.join(' ')
  }

  async execute<T>(): Promise<T[]> {
    const query = this.build()
    const timer = performanceMonitor.startTimer('database_query')
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('execute_query', {
        query_text: query
      })
      
      timer()
      
      if (error) throw error
      return data as T[]
    } catch (error) {
      timer()
      log.error('Query execution failed', { error, query })
      throw error
    }
  }
}

// Database connection pool optimization
export class DatabaseConnectionManager {
  private activeConnections = 0
  private maxConnections = 20
  private waitQueue: Array<() => void> = []

  async acquireConnection(): Promise<void> {
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++
      return
    }

    // Wait for connection
    return new Promise((resolve) => {
      this.waitQueue.push(resolve)
    })
  }

  releaseConnection(): void {
    this.activeConnections--
    
    // Notify waiting requests
    const waiter = this.waitQueue.shift()
    if (waiter) {
      this.activeConnections++
      waiter()
    }
  }

  async withConnection<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireConnection()
    
    try {
      return await fn()
    } finally {
      this.releaseConnection()
    }
  }

  getStats(): {
    active: number
    available: number
    waiting: number
  } {
    return {
      active: this.activeConnections,
      available: this.maxConnections - this.activeConnections,
      waiting: this.waitQueue.length,
    }
  }
}

// Create RPC functions for database optimization
export const databaseOptimizationFunctions = `
-- Get slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(duration_threshold INT DEFAULT 1000)
RETURNS TABLE(
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  max_time DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    query::TEXT,
    calls,
    total_time,
    mean_time,
    max_time
  FROM pg_stat_statements
  WHERE mean_time > duration_threshold
  ORDER BY mean_time DESC
  LIMIT 20;
END;
$$;

-- Get missing indexes
CREATE OR REPLACE FUNCTION get_missing_indexes()
RETURNS TABLE(
  table_name TEXT,
  column_name TEXT,
  index_type TEXT,
  estimated_benefit INT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- This is a simplified version
  -- In production, you'd use pg_stats and query patterns
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS table_name,
    attname AS column_name,
    'btree' AS index_type,
    100 AS estimated_benefit
  FROM pg_stats
  WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.1
  LIMIT 10;
END;
$$;

-- Get table sizes
CREATE OR REPLACE FUNCTION get_table_sizes()
RETURNS TABLE(
  table_name TEXT,
  size_bytes BIGINT,
  size_pretty TEXT,
  row_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename AS table_name,
    pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size_pretty,
    n_live_tup AS row_count
  FROM pg_stat_user_tables
  ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
END;
$$;

-- Get query statistics
CREATE OR REPLACE FUNCTION get_query_stats()
RETURNS TABLE(
  query_pattern TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  mean_time DOUBLE PRECISION,
  rows_returned BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    regexp_replace(query::TEXT, '\\d+', '?', 'g') AS query_pattern,
    SUM(calls) AS calls,
    SUM(total_time) AS total_time,
    AVG(mean_time) AS mean_time,
    SUM(rows) AS rows_returned
  FROM pg_stat_statements
  GROUP BY query_pattern
  ORDER BY total_time DESC
  LIMIT 50;
END;
$$;

-- Explain query
CREATE OR REPLACE FUNCTION explain_query(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  plan JSON;
BEGIN
  EXECUTE 'EXPLAIN (FORMAT JSON, ANALYZE FALSE) ' || query_text INTO plan;
  RETURN plan;
END;
$$;
`