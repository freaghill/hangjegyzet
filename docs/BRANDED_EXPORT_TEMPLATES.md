# Branded Export Templates

## Overview
The HangJegyzet.AI platform now supports fully customizable branded PDF exports, allowing organizations to maintain their visual identity across all exported documents.

## Features

### 1. Organization Branding System
- **Custom Logo**: Upload and position organization logos
- **Color Scheme**: Define primary, secondary, and accent colors
- **Typography**: Set custom fonts for headings and body text
- **Headers/Footers**: Configurable with dynamic content
- **Watermarks**: Add security watermarks with adjustable opacity
- **Confidentiality Notices**: Display custom security warnings

### 2. Branding Components

#### Visual Identity (`/lib/export/branding.ts`)
```typescript
interface OrganizationBranding {
  logo?: {
    url: string
    width?: number
    height?: number
    position?: 'left' | 'center' | 'right'
  }
  colors?: {
    primary: string
    secondary?: string
    accent?: string
    text?: string
    background?: string
  }
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
}
```

#### Header/Footer Configuration
- Dynamic page numbering
- Custom text elements
- Date inclusion
- Logo placement
- Confidentiality markers

### 3. Enhanced PDF Generator

The `PDFGenerator` class now includes:
- `generateBrandedPDF()` - Creates PDFs with organization branding
- Automatic CSS generation based on branding settings
- Header/footer template rendering
- Watermark overlay support

### 4. UI Component

The `OrganizationBrandingSettings` component (`/components/settings/organization-branding.tsx`) provides:
- Visual branding editor
- Real-time preview
- Logo upload functionality
- Color picker interface
- Typography controls
- Header/footer customization

### 5. Database Schema

Added to organizations table:
- `branding_settings` (JSONB) - Stores all branding configuration
- Storage bucket `branding` for logo and asset storage
- RLS policies for secure access

## Usage

### Setting Up Organization Branding

1. Navigate to Settings → Organization → Branding
2. Upload organization logo
3. Configure colors and typography
4. Set header/footer preferences
5. Add watermark if needed
6. Save settings

### Exporting with Branding

When exporting a meeting:
```typescript
const exportService = new ExportService()
await exportService.exportMeeting(meetingId, {
  format: 'pdf',
  templateId: 'business_summary',
  branding: {
    logo: 'https://example.com/logo.png',
    primaryColor: '#2563eb',
    companyName: 'Acme Corp'
  }
})
```

### API Endpoint

The export endpoint automatically applies organization branding:
```
POST /api/meetings/{id}/export
{
  "format": "pdf",
  "templateId": "business_summary",
  "includeTranscript": true,
  "includeSummary": true
}
```

## Branding Examples

### Professional Business
```json
{
  "colors": {
    "primary": "#1e40af",
    "secondary": "#64748b",
    "text": "#1f2937"
  },
  "fonts": {
    "heading": "Helvetica Neue, sans-serif",
    "body": "Arial, sans-serif"
  },
  "header": {
    "show": true,
    "text": "CONFIDENTIAL - INTERNAL USE ONLY",
    "includePageNumbers": true
  }
}
```

### Legal Firm
```json
{
  "colors": {
    "primary": "#0f172a",
    "secondary": "#475569",
    "accent": "#b91c1c"
  },
  "document": {
    "watermark": "PRIVILEGED",
    "confidentialityNotice": "Attorney-Client Privileged Communication"
  }
}
```

### Healthcare Organization
```json
{
  "colors": {
    "primary": "#059669",
    "secondary": "#6b7280"
  },
  "document": {
    "confidentialityNotice": "Protected Health Information - HIPAA Compliant"
  },
  "footer": {
    "includeConfidentiality": true
  }
}
```

## Best Practices

1. **Logo Guidelines**
   - Use high-resolution logos (min 300dpi for print)
   - Prefer SVG format for scalability
   - Keep file size under 5MB

2. **Color Selection**
   - Ensure sufficient contrast for readability
   - Test colors in both digital and print formats
   - Consider accessibility (WCAG compliance)

3. **Typography**
   - Use web-safe fonts or ensure font availability
   - Maintain consistent hierarchy
   - Test readability at different sizes

4. **Security**
   - Use watermarks for sensitive documents
   - Include confidentiality notices where required
   - Consider different branding for internal vs external documents

## Migration Guide

For existing organizations:
1. Default branding is automatically applied
2. Existing exports remain unchanged
3. New exports will use branding settings
4. Logo migration from old system handled automatically

## Future Enhancements

1. **Template Library**
   - Pre-designed branding themes
   - Industry-specific templates
   - Quick style switcher

2. **Advanced Features**
   - Multi-brand support per organization
   - Department-specific branding
   - Event-based branding (e.g., holiday themes)

3. **Export Analytics**
   - Track which branding performs best
   - A/B testing for different styles
   - Usage statistics per template