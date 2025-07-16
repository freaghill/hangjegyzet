'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Circle,
  MousePointer,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface TourStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right'
  action?: () => void
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Üdvözöljük a HangJegyzetben! 👋',
    description: 'Fedezze fel platformunk főbb funkcióit ebben a rövid bemutatóban.',
  },
  {
    id: 'new-meeting',
    title: 'Új meeting létrehozása',
    description: 'Kattintson az "Új meeting" gombra a navigációs sávban egy új felvétel indításához.',
    target: '[data-tour="new-meeting"]',
    position: 'bottom',
  },
  {
    id: 'meetings-list',
    title: 'Meeting lista',
    description: 'Itt találja az összes rögzített meetingjét. Használja a szűrőket és keresést a gyors navigációhoz.',
    target: '[data-tour="meetings-list"]',
    position: 'right',
  },
  {
    id: 'meeting-details',
    title: 'Meeting részletek',
    description: 'Kattintson egy meetingre a teljes átirat, összefoglaló és egyéb funkciók eléréséhez.',
    target: '[data-tour="meeting-card"]',
    position: 'top',
  },
  {
    id: 'collaboration',
    title: 'Csapatmunka',
    description: 'Használja a megjegyzések és feladatok funkciókat a hatékony együttműködéshez.',
    target: '[data-tour="collaboration"]',
    position: 'left',
  },
  {
    id: 'export',
    title: 'Exportálás',
    description: 'Töltse le meetingjeit különböző formátumokban: PDF, Word, Excel vagy Markdown.',
    target: '[data-tour="export"]',
    position: 'top',
  },
  {
    id: 'analytics',
    title: 'Elemzések',
    description: 'Tekintse meg részletes statisztikáit és elemzéseit az Analytics menüpontban.',
    target: '[data-tour="analytics"]',
    position: 'bottom',
  },
  {
    id: 'complete',
    title: 'Gratulálunk! 🎉',
    description: 'Megismerte a főbb funkciókat. Kezdje el használni a HangJegyzetet még ma!',
  },
]

interface InteractiveTourProps {
  onComplete?: () => void
  autoStart?: boolean
}

export function InteractiveTour({ onComplete, autoStart = false }: InteractiveTourProps) {
  const [isActive, setIsActive] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Check if user has completed tour
    checkTourStatus()
  }, [])

  useEffect(() => {
    if (autoStart) {
      startTour()
    }
  }, [autoStart])

  useEffect(() => {
    if (isActive) {
      highlightCurrentStep()
    } else {
      removeHighlight()
    }

    return () => {
      removeHighlight()
    }
  }, [currentStep, isActive])

  async function checkTourStatus() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()

    if (!profile?.onboarding_completed && autoStart) {
      // Auto-start tour for new users
      setTimeout(() => startTour(), 1000)
    }
  }

  function startTour() {
    setIsActive(true)
    setCurrentStep(0)
    setCompletedSteps([])
  }

  function endTour() {
    setIsActive(false)
    removeHighlight()
    saveTourCompletion()
    onComplete?.()
  }

  async function saveTourCompletion() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
  }

  function nextStep() {
    const step = tourSteps[currentStep]
    setCompletedSteps([...completedSteps, step.id])

    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      endTour()
    }
  }

  function previousStep() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  function highlightCurrentStep() {
    removeHighlight()

    const step = tourSteps[currentStep]
    if (!step.target) return

    const element = document.querySelector(step.target) as HTMLElement
    if (!element) return

    // Add highlight class
    element.classList.add('tour-highlight')
    setHighlightedElement(element)

    // Scroll into view
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Add overlay
    const overlay = document.createElement('div')
    overlay.className = 'tour-overlay'
    document.body.appendChild(overlay)
  }

  function removeHighlight() {
    if (highlightedElement) {
      highlightedElement.classList.remove('tour-highlight')
    }

    const overlay = document.querySelector('.tour-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={startTour}
        className="gap-2"
      >
        <Sparkles className="h-4 w-4" />
        Bemutató indítása
      </Button>
    )
  }

  const step = tourSteps[currentStep]
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  return (
    <>
      {/* Tour card */}
      <div className={cn(
        "fixed z-[100] transition-all duration-300",
        // Position based on step
        step.position === 'top' && "bottom-24 left-1/2 -translate-x-1/2",
        step.position === 'bottom' && "top-24 left-1/2 -translate-x-1/2",
        step.position === 'left' && "right-8 top-1/2 -translate-y-1/2",
        step.position === 'right' && "left-8 top-1/2 -translate-y-1/2",
        !step.position && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      )}>
        <Card className="w-96 shadow-2xl border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary">
                {currentStep + 1} / {tourSteps.length}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={endTour}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="mb-4" />
            
            {/* Step indicators */}
            <div className="flex gap-1 mb-4">
              {tourSteps.map((s, index) => (
                <div
                  key={s.id}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-colors",
                    index < currentStep && "bg-blue-500",
                    index === currentStep && "bg-blue-500 animate-pulse",
                    index > currentStep && "bg-gray-200"
                  )}
                />
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={previousStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Előző
            </Button>
            
            {currentStep < tourSteps.length - 1 ? (
              <Button size="sm" onClick={nextStep}>
                Következő
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={endTour}>
                Befejezés
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Pointer animation */}
      {step.target && (
        <div className={cn(
          "fixed z-[99] pointer-events-none animate-bounce",
          // Position pointer near target
          step.position === 'top' && "bottom-20",
          step.position === 'bottom' && "top-20",
          step.position === 'left' && "right-4",
          step.position === 'right' && "left-4"
        )}>
          <MousePointer className="h-8 w-8 text-blue-500 rotate-12" />
        </div>
      )}

      {/* Global styles for tour */}
      <style jsx global>{`
        .tour-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 90;
          pointer-events: none;
        }

        .tour-highlight {
          position: relative;
          z-index: 95;
          outline: 3px solid #3B82F6;
          outline-offset: 4px;
          border-radius: 8px;
          animation: tour-pulse 2s infinite;
        }

        @keyframes tour-pulse {
          0%, 100% {
            outline-color: #3B82F6;
            outline-offset: 4px;
          }
          50% {
            outline-color: #60A5FA;
            outline-offset: 8px;
          }
        }
      `}</style>
    </>
  )
}