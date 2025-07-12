'use client'

import { Toggle } from '@/components/ui/toggle'
import { Sparkles, Layout } from 'lucide-react'
import { useUIMode } from '@/hooks/use-ui-mode'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function UIModeToggle() {
  const { mode, toggleMode, hasSeenAdvanced, markAdvancedSeen } = useUIMode()
  
  const handleToggle = () => {
    toggleMode()
    if (mode === 'simple' && !hasSeenAdvanced) {
      markAdvancedSeen()
    }
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            pressed={mode === 'advanced'}
            onPressedChange={handleToggle}
            size="sm"
            className="gap-2"
          >
            {mode === 'simple' ? (
              <>
                <Layout className="h-4 w-4" />
                <span className="hidden sm:inline">Egyszerű</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Haladó</span>
              </>
            )}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {mode === 'simple' 
              ? 'Váltás haladó nézetre további funkciókért'
              : 'Váltás egyszerű nézetre'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Feature gate component
export function AdvancedFeature({ 
  children,
  showMessage = true 
}: { 
  children: React.ReactNode
  showMessage?: boolean 
}) {
  const mode = useUIMode((state) => state.mode)
  
  if (mode === 'simple') {
    if (showMessage) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">
            Ez a funkció haladó módban érhető el
          </p>
        </div>
      )
    }
    return null
  }
  
  return <>{children}</>
}