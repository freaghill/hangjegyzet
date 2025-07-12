export interface OrganizationBranding {
  // Logo and visual identity
  logo?: {
    url: string
    width?: number
    height?: number
    position?: 'left' | 'center' | 'right'
  }
  
  // Color scheme
  colors?: {
    primary: string
    secondary?: string
    accent?: string
    text?: string
    background?: string
  }
  
  // Typography
  fonts?: {
    heading?: string
    body?: string
    size?: {
      base?: number
      h1?: number
      h2?: number
      h3?: number
    }
  }
  
  // Header/Footer
  header?: {
    show: boolean
    text?: string
    includePageNumbers?: boolean
    includeLogo?: boolean
  }
  
  footer?: {
    show: boolean
    text?: string
    includeDate?: boolean
    includeConfidentiality?: boolean
    customText?: string
  }
  
  // Document settings
  document?: {
    watermark?: string
    watermarkOpacity?: number
    confidentialityNotice?: string
    language?: 'hu' | 'en'
  }
}

export const defaultBranding: OrganizationBranding = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#f59e0b',
    text: '#1f2937',
    background: '#ffffff'
  },
  fonts: {
    heading: 'Inter, system-ui, -apple-system, sans-serif',
    body: 'Inter, system-ui, -apple-system, sans-serif',
    size: {
      base: 14,
      h1: 28,
      h2: 24,
      h3: 20
    }
  },
  header: {
    show: true,
    includePageNumbers: true,
    includeLogo: true
  },
  footer: {
    show: true,
    includeDate: true,
    includeConfidentiality: false
  },
  document: {
    language: 'hu'
  }
}

export function generateBrandedCSS(branding: OrganizationBranding): string {
  const merged = { ...defaultBranding, ...branding }
  
  return `
    /* Branded styles for organization */
    :root {
      --primary-color: ${merged.colors?.primary || defaultBranding.colors!.primary};
      --secondary-color: ${merged.colors?.secondary || defaultBranding.colors!.secondary};
      --accent-color: ${merged.colors?.accent || defaultBranding.colors!.accent};
      --text-color: ${merged.colors?.text || defaultBranding.colors!.text};
      --background-color: ${merged.colors?.background || defaultBranding.colors!.background};
      
      --font-heading: ${merged.fonts?.heading || defaultBranding.fonts!.heading};
      --font-body: ${merged.fonts?.body || defaultBranding.fonts!.body};
      --font-size-base: ${merged.fonts?.size?.base || defaultBranding.fonts!.size!.base}pt;
      --font-size-h1: ${merged.fonts?.size?.h1 || defaultBranding.fonts!.size!.h1}pt;
      --font-size-h2: ${merged.fonts?.size?.h2 || defaultBranding.fonts!.size!.h2}pt;
      --font-size-h3: ${merged.fonts?.size?.h3 || defaultBranding.fonts!.size!.h3}pt;
    }
    
    body {
      font-family: var(--font-body);
      font-size: var(--font-size-base);
      color: var(--text-color);
      background-color: var(--background-color);
      line-height: 1.6;
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      color: var(--primary-color);
      margin-bottom: 0.5em;
    }
    
    h1 { font-size: var(--font-size-h1); }
    h2 { font-size: var(--font-size-h2); }
    h3 { font-size: var(--font-size-h3); }
    
    a {
      color: var(--primary-color);
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 2px solid var(--primary-color);
      margin-bottom: 30px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 0.9em;
      color: var(--secondary-color);
    }
    
    .logo {
      max-height: 60px;
      max-width: 200px;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(0, 0, 0, ${merged.document?.watermarkOpacity || 0.05});
      z-index: -1;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .confidential-notice {
      background-color: #fee2e2;
      border: 1px solid #ef4444;
      color: #991b1b;
      padding: 10px 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      font-weight: 500;
    }
    
    .page-number {
      position: fixed;
      bottom: 20px;
      right: 20px;
      font-size: 0.9em;
      color: var(--secondary-color);
    }
    
    /* Table styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    th {
      background-color: var(--primary-color);
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    /* Highlight boxes */
    .highlight {
      background-color: #fef3c7;
      border-left: 4px solid var(--accent-color);
      padding: 15px;
      margin: 20px 0;
    }
    
    .action-item {
      background-color: #dbeafe;
      border-left: 4px solid var(--primary-color);
      padding: 10px 15px;
      margin: 10px 0;
    }
    
    /* Print specific styles */
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .page-break {
        page-break-after: always;
      }
      
      .no-print {
        display: none;
      }
    }
  `
}

export function generateHeaderTemplate(branding: OrganizationBranding, pageTitle?: string): string {
  if (!branding.header?.show) return ''
  
  const parts: string[] = []
  
  if (branding.header.includeLogo && branding.logo) {
    parts.push(`
      <img src="${branding.logo.url}" 
           alt="Logo" 
           class="logo" 
           style="float: ${branding.logo.position || 'left'};"
      />
    `)
  }
  
  if (branding.header.text) {
    parts.push(`<div class="header-text">${branding.header.text}</div>`)
  }
  
  if (pageTitle) {
    parts.push(`<h1 class="page-title">${pageTitle}</h1>`)
  }
  
  return `<div class="header">${parts.join('')}</div>`
}

export function generateFooterTemplate(branding: OrganizationBranding): string {
  if (!branding.footer?.show) return ''
  
  const parts: string[] = []
  
  if (branding.footer.includeDate) {
    const date = new Date().toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    parts.push(`<span class="footer-date">${date}</span>`)
  }
  
  if (branding.footer.text) {
    parts.push(`<span class="footer-text">${branding.footer.text}</span>`)
  }
  
  if (branding.footer.customText) {
    parts.push(`<span class="footer-custom">${branding.footer.customText}</span>`)
  }
  
  if (branding.footer.includeConfidentiality) {
    parts.push(`<span class="footer-confidential">Bizalmas - Tilos a jogosulatlan terjesztés</span>`)
  }
  
  return `<div class="footer">${parts.join(' • ')}</div>`
}