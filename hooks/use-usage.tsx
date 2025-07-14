'use client'

import { useState, useEffect } from 'react'

export interface UsageData {
  organizationId: string
  transcriptionMinutes: number
  apiCalls: number
  storageBytes: number
  transcriptionLimit: number
  apiLimit: number
  storageLimit: number
  isWithinLimits: boolean
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage')
      if (!response.ok) {
        throw new Error('Failed to fetch usage')
      }
      const data = await response.json()
      setUsage(data)
      setError(null)
    } catch (err) {
      setError('Nem sikerült betölteni a használati adatokat')
      console.error('Error loading usage:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsage()
    // Refresh usage every minute
    const interval = setInterval(fetchUsage, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatUsage = (data: UsageData) => {
    const getUsagePercentage = (current: number, limit: number): number => {
      if (limit === -1) return 0 // Unlimited
      if (limit === 0) return 100 // No limit set
      return Math.round((current / limit) * 100)
    }

    return {
      transcription: {
        used: data.transcriptionMinutes,
        limit: data.transcriptionLimit === -1 ? 'Korlátlan' : data.transcriptionLimit,
        percentage: getUsagePercentage(data.transcriptionMinutes, data.transcriptionLimit),
        remaining: data.transcriptionLimit === -1 ? 'Korlátlan' : 
                   Math.max(0, data.transcriptionLimit - data.transcriptionMinutes)
      },
      api: {
        used: data.apiCalls,
        limit: data.apiLimit === -1 ? 'Korlátlan' : data.apiLimit,
        percentage: getUsagePercentage(data.apiCalls, data.apiLimit),
        remaining: data.apiLimit === -1 ? 'Korlátlan' : 
                   Math.max(0, data.apiLimit - data.apiCalls)
      },
      storage: {
        usedGB: (data.storageBytes / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: data.storageLimit === -1 ? 'Korlátlan' : 
                 (data.storageLimit / (1024 * 1024 * 1024)).toFixed(0),
        percentage: getUsagePercentage(data.storageBytes, data.storageLimit),
        remainingGB: data.storageLimit === -1 ? 'Korlátlan' : 
                     ((data.storageLimit - data.storageBytes) / (1024 * 1024 * 1024)).toFixed(2)
      }
    }
  }

  return {
    usage,
    isLoading,
    error,
    formatUsage: usage ? formatUsage(usage) : null,
    refresh: fetchUsage
  }
}