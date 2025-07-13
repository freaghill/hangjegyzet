'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Globe, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Languages
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

export type SupportedLanguage = 'hu' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'ro' | 'sk' | 'cs' | 'pl'

interface LanguageSelectorProps {
  value: SupportedLanguage
  onChange: (language: SupportedLanguage) => void
  meetingId?: string
  showAutoDetect?: boolean
  disabled?: boolean
  className?: string
}

const languages: Array<{ code: SupportedLanguage; name: string; flag: string }> = [
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
]

export function LanguageSelector({
  value,
  onChange,
  meetingId,
  showAutoDetect = false,
  disabled,
  className
}: LanguageSelectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState<{
    code: SupportedLanguage
    confidence: number
  } | null>(null)
  const { toast } = useToast()

  const handleAutoDetect = async () => {
    if (!meetingId) return
    
    setIsDetecting(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/detect-language`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Language detection failed')
      }
      
      const data = await response.json()
      setDetectedLanguage(data.language)
      onChange(data.language.code)
      
      toast({
        title: 'Nyelv észlelve',
        description: `${data.language.name} (${Math.round(data.language.confidence * 100)}% bizonyosság)`,
      })
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült automatikusan felismerni a nyelvet',
        variant: 'destructive'
      })
    } finally {
      setIsDetecting(false)
    }
  }

  const selectedLanguage = languages.find(lang => lang.code === value)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor="language-select" className="text-base">
          Átírás nyelve
        </Label>
        {showAutoDetect && meetingId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoDetect}
            disabled={disabled || isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Felismerés...
              </>
            ) : (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Automatikus felismerés
              </>
            )}
          </Button>
        )}
      </div>

      <Select
        value={value}
        onValueChange={(val) => onChange(val as SupportedLanguage)}
        disabled={disabled || isDetecting}
      >
        <SelectTrigger id="language-select" className="w-full">
          <SelectValue>
            {selectedLanguage && (
              <div className="flex items-center space-x-2">
                <span className="text-lg">{selectedLanguage.flag}</span>
                <span>{selectedLanguage.name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.code} value={language.code}>
              <div className="flex items-center space-x-2">
                <span className="text-lg">{language.flag}</span>
                <span>{language.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {detectedLanguage && (
        <div className="flex items-center space-x-2 text-sm">
          {detectedLanguage.confidence > 0.8 ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
          <span className="text-muted-foreground">
            Észlelt nyelv: {languages.find(l => l.code === detectedLanguage.code)?.name}
          </span>
          <Badge variant={detectedLanguage.confidence > 0.8 ? 'default' : 'secondary'}>
            {Math.round(detectedLanguage.confidence * 100)}%
          </Badge>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          <Globe className="inline h-3 w-3 mr-1" />
          Az átírás pontossága a választott nyelvtől függ
        </p>
        {value !== 'hu' && (
          <p className="text-xs text-yellow-600">
            <AlertCircle className="inline h-3 w-3 mr-1" />
            A nem magyar nyelvű átírások hosszabb időt vehetnek igénybe
          </p>
        )}
      </div>
    </div>
  )
}