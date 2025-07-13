'use client'

import { useState, useEffect } from 'react'
import { Info, Zap, Scale, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { canUseMode, type ModeAllocation } from '@/lib/payments/subscription-plans'
import type { SubscriptionPlanDetails } from '@/lib/payments/subscription-plans'

export type TranscriptionMode = 'fast' | 'balanced' | 'precision'

interface ModeOption {
  mode: TranscriptionMode
  name: string
  description: string
  accuracy: string
  bestFor: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  credits: number
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'fast',
    name: 'Fast',
    description: 'Gyors átírás jó minőségű hanganyagokhoz',
    accuracy: '90-93%',
    bestFor: 'Tiszta hang, informális megbeszélések',
    icon: Zap,
    color: 'text-green-600',
    credits: 1,
  },
  {
    mode: 'balanced',
    name: 'Balanced',
    description: 'Kiegyensúlyozott mód a legtöbb üzleti megbeszéléshez',
    accuracy: '94-96%',
    bestFor: 'Üzleti meetingek, prezentációk',
    icon: Scale,
    color: 'text-blue-600',
    credits: 2,
  },
  {
    mode: 'precision',
    name: 'Precision',
    description: 'Maximális pontosság kritikus tartalmakhoz',
    accuracy: '97%+',
    bestFor: 'Jogi, orvosi, pénzügyi megbeszélések',
    icon: Target,
    color: 'text-orange-600',
    credits: 5,
  },
]

interface ModeSelectorProps {
  selectedMode: TranscriptionMode
  onModeChange: (mode: TranscriptionMode) => void
  currentUsage?: ModeAllocation
  userPlan?: SubscriptionPlanDetails
  audioQuality?: number // 0-1 score from audio analysis
  meetingType?: string
  estimatedDuration?: number // in minutes
}

export function ModeSelector({
  selectedMode,
  onModeChange,
  currentUsage = { fast: 0, balanced: 0, precision: 0 },
  userPlan,
  audioQuality,
  meetingType,
  estimatedDuration = 60,
}: ModeSelectorProps) {
  const [recommendedMode, setRecommendedMode] = useState<TranscriptionMode>('balanced')
  const [showDetails, setShowDetails] = useState(false)

  // Calculate recommended mode based on audio quality and meeting type
  useEffect(() => {
    let recommended: TranscriptionMode = 'balanced'
    
    if (audioQuality !== undefined) {
      if (audioQuality > 0.8) {
        recommended = 'fast'
      } else if (audioQuality < 0.5) {
        recommended = 'precision'
      }
    }
    
    // Override based on meeting type
    if (meetingType) {
      const precisionTypes = ['legal', 'medical', 'financial', 'jogi', 'orvosi', 'pénzügyi']
      if (precisionTypes.some(type => meetingType.toLowerCase().includes(type))) {
        recommended = 'precision'
      }
    }
    
    setRecommendedMode(recommended)
  }, [audioQuality, meetingType])

  const getModeAvailability = (mode: TranscriptionMode) => {
    if (!userPlan) return { available: true, remaining: -1, limit: -1 }
    return canUseMode(userPlan, mode, currentUsage)
  }

  const calculateCost = (mode: TranscriptionMode) => {
    const option = MODE_OPTIONS.find(opt => opt.mode === mode)
    if (!option) return 0
    return option.credits * estimatedDuration
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Átírási mód választása</h3>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          {showDetails ? 'Részletek elrejtése' : 'Részletek'}
        </button>
      </div>

      <div className="grid gap-3">
        {MODE_OPTIONS.map((option) => {
          const availability = getModeAvailability(option.mode)
          const isRecommended = option.mode === recommendedMode
          const isSelected = option.mode === selectedMode
          const isDisabled = !availability.available
          const Icon = option.icon

          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => !isDisabled && onModeChange(option.mode)}
              disabled={isDisabled}
              className={cn(
                'relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all',
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isDisabled
                  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                isRecommended && !isSelected && !isDisabled && 'ring-2 ring-green-500 ring-offset-2'
              )}
            >
              {isRecommended && !isDisabled && (
                <span className="absolute -top-2 left-4 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded">
                  Ajánlott
                </span>
              )}

              <Icon className={cn('w-6 h-6 mt-0.5', option.color)} />
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{option.name}</h4>
                  <span className="text-sm text-gray-600">({option.accuracy} pontosság)</span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                
                {showDetails && (
                  <p className="text-xs text-gray-500 mt-2">
                    <strong>Ideális:</strong> {option.bestFor}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-3">
                  <div className="text-sm">
                    <span className="text-gray-600">Kredit/perc: </span>
                    <span className="font-semibold">{option.credits}</span>
                  </div>
                  
                  {userPlan && availability.limit !== -1 && (
                    <div className="text-sm">
                      <span className="text-gray-600">Hátralévő: </span>
                      <span className={cn(
                        'font-semibold',
                        availability.remaining < availability.limit * 0.2 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {availability.remaining} / {availability.limit} perc
                      </span>
                    </div>
                  )}
                </div>

                {isDisabled && (
                  <p className="text-xs text-red-600 mt-2">
                    Elérte a havi limitet ehhez a módhoz
                  </p>
                )}
              </div>

              {estimatedDuration > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Becsült költség</p>
                  <p className="text-lg font-semibold">{calculateCost(option.mode)} kredit</p>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {audioQuality !== undefined && audioQuality < 0.5 && selectedMode !== 'precision' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Figyelem:</strong> Az audio minősége gyenge. A Precision mód használata ajánlott a pontosabb átíráshoz.
          </p>
        </div>
      )}

      {estimatedDuration > 180 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">
            <strong>Figyelem:</strong> A maximum meeting hossz 3 óra (180 perc). Hosszabb felvételeket részekre kell bontani.
          </p>
        </div>
      )}
    </div>
  )
}