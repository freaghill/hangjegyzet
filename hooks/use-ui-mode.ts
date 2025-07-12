'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIMode {
  mode: 'simple' | 'advanced'
  hasSeenAdvanced: boolean
  toggleMode: () => void
  setMode: (mode: 'simple' | 'advanced') => void
  markAdvancedSeen: () => void
}

export const useUIMode = create<UIMode>()(
  persist(
    (set) => ({
      mode: 'simple',
      hasSeenAdvanced: false,
      toggleMode: () => set((state) => ({ 
        mode: state.mode === 'simple' ? 'advanced' : 'simple' 
      })),
      setMode: (mode) => set({ mode }),
      markAdvancedSeen: () => set({ hasSeenAdvanced: true })
    }),
    {
      name: 'ui-mode'
    }
  )
)

// Helper hook to check if feature should be shown
export function useFeatureVisibility(feature: 'ai' | 'realtime' | 'integrations' | 'analytics') {
  const mode = useUIMode((state) => state.mode)
  
  const simpleFeatures = ['upload', 'transcribe', 'export']
  const advancedFeatures = ['ai', 'realtime', 'integrations', 'analytics']
  
  if (mode === 'simple') {
    return simpleFeatures.includes(feature)
  }
  
  return true
}