'use client'

import { HelpCircle, Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ContextualHelpProps {
  content: string
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
  icon?: 'help' | 'info'
  size?: 'sm' | 'md'
}

export function ContextualHelp({
  content,
  side = 'top',
  className,
  icon = 'help',
  size = 'sm',
}: ContextualHelpProps) {
  const Icon = icon === 'help' ? HelpCircle : Info
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-auto w-auto p-0 hover:bg-transparent',
              className
            )}
          >
            <Icon className={cn(iconSize, 'text-muted-foreground hover:text-foreground transition-colors')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Help content for common features
export const HelpContent = {
  // Meeting features
  transcriptionMode: 'Válasszon a gyors (5 perc), kiegyensúlyozott (10 perc) vagy precíz (20 perc) feldolgozás között. A precíz mód jobb pontosságot biztosít.',
  
  meetingUpload: 'Támogatott formátumok: MP3, WAV, M4A, MP4. Maximum 2GB fájlméret és 4 óra hosszúság.',
  
  googleDriveSync: 'Automatikusan feldolgozza a Google Drive mappájába feltöltött hangfájlokat. A feldolgozás után értesítést kap.',
  
  exportOptions: 'Exportáljon PDF, Word vagy egyéb formátumokba. Használjon sablonokat a professzionális megjelenéshez.',
  
  // Collaboration
  mentions: 'Használja a @ jelet, hogy megemlítsen valakit. Az illető értesítést kap a megemlítésről.',
  
  actionItems: 'Hozzon létre teendőket a megbeszélésből. Rendeljen hozzá felelősöket és határidőket.',
  
  annotations: 'Kattintson az átírás bármely részére, hogy megjegyzést fűzzön hozzá. Mások is látni fogják és reagálhatnak rá.',
  
  // Settings
  webhooks: 'Küldjön automatikus értesítéseket külső rendszerekbe, amikor egy meeting feldolgozása befejeződik.',
  
  branding: 'Testreszabhatja a PDF exportok megjelenését a szervezete arculatának megfelelően.',
  
  // Billing
  credits: 'Egy kredit = egy perc átírás. A fel nem használt kreditek nem vihetők át a következő hónapra.',
  
  // Security
  encryption: 'Minden adat titkosítva van átvitel közben (TLS) és nyugalmi állapotban (AES-256).',
  
  dataRetention: 'Az adatokat 90 napig tároljuk az utolsó hozzáférés után, kivéve ha korábban törli őket.',
}