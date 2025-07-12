import { MeetingTemplate, TemplateType } from './meeting-templates'

export const DEFAULT_TEMPLATES: Omit<MeetingTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>[] = [
  {
    organization_id: null,
    name: 'Napi Standup',
    slug: 'daily-standup',
    description: 'Gyors napi szinkron megbeszélés a haladásról és akadályokról',
    is_default: true,
    is_active: true,
    template_type: 'standup',
    sections: [
      {
        name: 'Tegnap',
        description: 'Mit sikerült befejezni tegnap',
        required: true
      },
      {
        name: 'Ma',
        description: 'Min fogok dolgozni ma',
        required: true
      },
      {
        name: 'Akadályok',
        description: 'Van-e valamilyen akadály vagy blocker',
        required: false
      }
    ],
    prompts: {
      summary: 'Foglald össze a csapattagok főbb frissítéseit',
      actionItems: 'Gyűjtsd ki a mai napra tett vállalásokat',
      blockers: 'Emeld ki az említett akadályokat és blockereket'
    },
    fields: {},
    analysis_config: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: true,
      customPrompts: [
        'Azonosítsd a csapattagok közötti függőségeket',
        'Jelöld meg azokat az elemeket, amelyek eszkalációt igényelhetnek'
      ]
    }
  },
  {
    organization_id: null,
    name: 'Sprint Tervezés',
    slug: 'sprint-planning',
    description: 'A következő sprint munkájának és vállalásainak megtervezése',
    is_default: true,
    is_active: true,
    template_type: 'planning',
    sections: [
      {
        name: 'Sprint Cél',
        description: 'A sprint átfogó célkitűzése',
        required: true
      },
      {
        name: 'Story Áttekintés',
        description: 'User story-k áttekintése és becslése',
        required: true
      },
      {
        name: 'Kapacitás Tervezés',
        description: 'Csapat kapacitása és elérhetősége',
        required: false
      },
      {
        name: 'Vállalások',
        description: 'Végleges sprint vállalások',
        required: true
      }
    ],
    prompts: {
      summary: 'Foglald össze a sprint céljait és főbb vállalásokat',
      actionItems: 'Listázd az összes vállalt user story-t felelősökkel',
      risks: 'Azonosítsd a tervezés során felmerült kockázatokat'
    },
    fields: {
      sprint_number: null,
      sprint_duration_days: 14
    },
    analysis_config: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: true,
      customPrompts: [
        'Számold ki az összes vállalt story point-ot',
        'Azonosítsd a más csapatoktól való függőségeket',
        'Értékeld a sprint terhelését a csapat kapacitásához képest'
      ]
    }
  },
  {
    organization_id: null,
    name: 'Sprint Retrospektív',
    slug: 'sprint-retrospective',
    description: 'Visszatekintés az elmúlt sprintre és fejlesztési lehetőségek azonosítása',
    is_default: true,
    is_active: true,
    template_type: 'retrospective',
    sections: [
      {
        name: 'Mi ment jól',
        description: 'Pozitív dolgok, amiket folytatni kell',
        required: true
      },
      {
        name: 'Mi lehetett volna jobb',
        description: 'Fejlesztendő területek',
        required: true
      },
      {
        name: 'Akciók',
        description: 'Konkrét fejlesztési lépések',
        required: true
      }
    ],
    prompts: {
      summary: 'Foglald össze a retrospektív főbb témáit',
      actionItems: 'Listázd az összes fejlesztési akciót felelősökkel',
      sentiment: 'Elemezd a csapat általános hangulatát és morálját'
    },
    fields: {},
    analysis_config: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: true,
      customPrompts: [
        'Azonosítsd a korábbi retrospektívekből visszatérő témákat',
        'Emeld ki a csapatdinamikai vagy együttműködési problémákat',
        'Értékeld a korábbi akciók hatékonyságát'
      ]
    }
  },
  {
    organization_id: null,
    name: 'Egy-az-egyhez Megbeszélés',
    slug: 'one-on-one',
    description: 'Rendszeres egyeztetés vezető és csapattag között',
    is_default: true,
    is_active: true,
    template_type: 'one_on_one',
    sections: [
      {
        name: 'Bejelentkezés',
        description: 'Általános közérzet és frissítések',
        required: true
      },
      {
        name: 'Haladás Áttekintés',
        description: 'Jelenlegi munka és célok áttekintése',
        required: true
      },
      {
        name: 'Visszajelzés',
        description: 'Kétirányú visszajelzés',
        required: false
      },
      {
        name: 'Karrier Fejlődés',
        description: 'Növekedési és fejlődési beszélgetés',
        required: false
      },
      {
        name: 'Következő Lépések',
        description: 'Akciók és vállalások',
        required: true
      }
    ],
    prompts: {
      summary: 'Foglald össze a főbb beszélgetési pontokat és eredményeket',
      actionItems: 'Listázd mindkét fél vállalásait',
      development: 'Emeld ki a megbeszélt karrierfejlődési témákat'
    },
    fields: {},
    analysis_config: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: false,
      customPrompts: [
        'Azonosítsd a felmerült aggályokat vagy problémákat',
        'Jegyezd fel az elismeréseket és pozitív visszajelzéseket',
        'Értékeld a munkavállaló motivációját és elkötelezettségét'
      ]
    }
  },
  {
    organization_id: null,
    name: 'Projekt Áttekintés',
    slug: 'project-review',
    description: 'Projekt státusz, kockázatok és következő lépések áttekintése',
    is_default: true,
    is_active: true,
    template_type: 'review',
    sections: [
      {
        name: 'Státusz Frissítés',
        description: 'Jelenlegi projekt státusz',
        required: true
      },
      {
        name: 'Mérföldkövek',
        description: 'Haladás a főbb mérföldkövek felé',
        required: true
      },
      {
        name: 'Kockázatok és Problémák',
        description: 'Aktuális kockázatok és kezelésük',
        required: true
      },
      {
        name: 'Költségvetés és Erőforrások',
        description: 'Erőforrás felhasználás',
        required: false
      },
      {
        name: 'Következő Lépések',
        description: 'Közelgő tevékenységek',
        required: true
      }
    ],
    prompts: {
      summary: 'Foglald össze a projekt státuszát és főbb döntéseket',
      actionItems: 'Listázd az összes döntést és hozzárendelt akciót',
      risks: 'Emeld ki az összes kockázatot és kezelési tervüket'
    },
    fields: {
      project_phase: null,
      completion_percentage: null
    },
    analysis_config: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: true,
      customPrompts: [
        'Azonosítsd az ütemezési vagy költségvetési aggályokat',
        'Jelöld meg az eszkalációt igénylő elemeket',
        'Értékeld a projekt általános egészségét és előrehaladását'
      ]
    }
  }
]

// Template icons for UI
export const TEMPLATE_ICONS: Record<TemplateType, string> = {
  standup: '🚀',
  planning: '📋',
  retrospective: '🔄',
  one_on_one: '👥',
  review: '📊',
  custom: '⚙️'
}

// Template colors for UI
export const TEMPLATE_COLORS: Record<TemplateType, string> = {
  standup: 'blue',
  planning: 'green',
  retrospective: 'purple',
  one_on_one: 'orange',
  review: 'red',
  custom: 'gray'
}

// Helper function to get template metadata
export function getTemplateMetadata(templateType: TemplateType) {
  return {
    icon: TEMPLATE_ICONS[templateType],
    color: TEMPLATE_COLORS[templateType]
  }
}