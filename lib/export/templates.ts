import { ExportTemplate as Template, TemplateSection } from './types'

const defaultStyles = {
  primaryColor: '#2563eb',
  secondaryColor: '#64748b',
  fontFamily: 'Arial, sans-serif',
  fontSize: {
    title: 24,
    heading: 18,
    body: 11,
    small: 9
  },
  spacing: {
    section: 10,
    paragraph: 5,
    line: 1.5
  },
  pageMargins: {
    top: 25,
    right: 25,
    bottom: 25,
    left: 25
  }
}

const businessTemplate: Template = {
  id: 'business',
  name: 'Üzleti sablon',
  type: 'business',
  description: 'Általános üzleti meetingekhez, értekezletekhez',
  sections: [
    {
      id: 'header',
      type: 'header',
      visible: true,
      order: 1
    },
    {
      id: 'metadata',
      type: 'metadata',
      visible: true,
      order: 2
    },
    {
      id: 'summary',
      type: 'summary',
      title: 'Vezetői összefoglaló',
      visible: true,
      order: 3
    },
    {
      id: 'action-items',
      type: 'action-items',
      title: 'Döntések és teendők',
      visible: true,
      order: 4
    },
    {
      id: 'transcript',
      type: 'transcript',
      title: 'Részletes jegyzőkönyv',
      visible: true,
      order: 5
    }
  ],
  styles: {
    ...defaultStyles,
    primaryColor: '#2563eb',
    fontFamily: 'Calibri, sans-serif'
  }
}

const legalTemplate: Template = {
  id: 'legal',
  name: 'Jogi sablon',
  type: 'legal',
  description: 'Jogi konzultációkhoz, ügyféltalálkozókhoz',
  sections: [
    {
      id: 'header',
      type: 'header',
      visible: true,
      order: 1
    },
    {
      id: 'metadata',
      type: 'metadata',
      visible: true,
      order: 2,
      config: {
        includeConfidentialityNotice: true,
        confidentialityText: 'BIZALMAS - Ügyvédi titok védelme alatt áll'
      }
    },
    {
      id: 'summary',
      type: 'summary',
      title: 'Ügyvédi összefoglaló',
      visible: true,
      order: 3
    },
    {
      id: 'action-items',
      type: 'action-items',
      title: 'Követendő lépések',
      visible: true,
      order: 4
    },
    {
      id: 'transcript',
      type: 'transcript',
      title: 'Teljes átírat',
      visible: true,
      order: 5,
      config: {
        includeTimestamps: true,
        verbatim: true
      }
    },
    {
      id: 'legal-notice',
      type: 'custom',
      title: 'Jogi nyilatkozat',
      visible: true,
      order: 6,
      config: {
        content: 'Ez a dokumentum bizalmas információkat tartalmaz, amely ügyvédi titok védelme alatt áll. A dokumentum jogosulatlan felhasználása, másolása vagy terjesztése szigorúan tilos.'
      }
    }
  ],
  styles: {
    ...defaultStyles,
    primaryColor: '#1e293b',
    fontFamily: 'Times New Roman, serif',
    fontSize: {
      ...defaultStyles.fontSize,
      body: 12
    }
  }
}

const medicalTemplate: Template = {
  id: 'medical',
  name: 'Egészségügyi sablon',
  type: 'medical',
  description: 'Orvosi konzultációkhoz, esetmegbeszélésekhez',
  sections: [
    {
      id: 'header',
      type: 'header',
      visible: true,
      order: 1
    },
    {
      id: 'metadata',
      type: 'metadata',
      visible: true,
      order: 2,
      config: {
        includePatientId: true,
        includeConfidentialityNotice: true,
        confidentialityText: 'SZIGORÚAN BIZALMAS - Orvosi titoktartás hatálya alatt'
      }
    },
    {
      id: 'clinical-summary',
      type: 'summary',
      title: 'Klinikai összefoglaló',
      visible: true,
      order: 3
    },
    {
      id: 'diagnosis-treatment',
      type: 'action-items',
      title: 'Diagnózis és kezelési terv',
      visible: true,
      order: 4,
      config: {
        categorize: true,
        categories: ['Diagnózis', 'Vizsgálatok', 'Kezelés', 'Követés']
      }
    },
    {
      id: 'consultation-notes',
      type: 'transcript',
      title: 'Konzultációs jegyzet',
      visible: true,
      order: 5,
      config: {
        includeTimestamps: false,
        summarized: true
      }
    },
    {
      id: 'medical-disclaimer',
      type: 'custom',
      title: 'Egészségügyi figyelmeztetés',
      visible: true,
      order: 6,
      config: {
        content: 'Ez a dokumentum egészségügyi információkat tartalmaz, amelyek kizárólag az érintett egészségügyi szakemberek számára készültek. A dokumentum GDPR és egészségügyi adatvédelmi előírások szerint védett.'
      }
    }
  ],
  styles: {
    ...defaultStyles,
    primaryColor: '#059669',
    fontFamily: 'Arial, sans-serif',
    spacing: {
      ...defaultStyles.spacing,
      section: 12
    }
  }
}

const customTemplate: Template = {
  id: 'custom',
  name: 'Egyéni sablon',
  type: 'custom',
  description: 'Testreszabható sablon egyedi igényekhez',
  sections: [
    {
      id: 'header',
      type: 'header',
      visible: true,
      order: 1
    },
    {
      id: 'metadata',
      type: 'metadata',
      visible: true,
      order: 2
    },
    {
      id: 'summary',
      type: 'summary',
      title: 'Összefoglaló',
      visible: true,
      order: 3
    },
    {
      id: 'action-items',
      type: 'action-items',
      title: 'Teendők',
      visible: true,
      order: 4
    },
    {
      id: 'transcript',
      type: 'transcript',
      title: 'Átírat',
      visible: true,
      order: 5
    }
  ],
  styles: defaultStyles
}

const templates: Record<string, Template> = {
  business: businessTemplate,
  legal: legalTemplate,
  medical: medicalTemplate,
  custom: customTemplate
}

export async function getExportTemplate(type: string): Promise<Template> {
  const template = templates[type]
  if (!template) {
    throw new Error(`Unknown template type: ${type}`)
  }
  
  // In a real implementation, this could load from database
  // allowing users to customize and save their own templates
  return template
}

export function getAvailableTemplates(): Template[] {
  return Object.values(templates)
}

export function createCustomTemplate(base: Template, customizations: Partial<Template>): Template {
  return {
    ...base,
    ...customizations,
    id: 'custom-' + Date.now(),
    type: 'custom',
    sections: customizations.sections || base.sections,
    styles: {
      ...base.styles,
      ...customizations.styles
    }
  }
}