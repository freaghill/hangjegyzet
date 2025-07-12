# HangJegyzet Logo Usage Guide

## Logo Variants

### 1. Full Logo (Desktop Headers)
```tsx
<Logo variant="full" size="md" />
```
- Use when width > 300px
- Primary brand representation
- Desktop navigation bars

### 2. Compact Logo (Mobile Headers)
```tsx
<Logo variant="compact" />
```
- Use when width 150-300px
- Mobile navigation
- Sidebar headers

### 3. Icon Only (App Icons)
```tsx
<Logo variant="icon" size="lg" />
```
- Use when width < 150px
- PWA icons
- Favicons
- Loading states

## Size Guidelines

- **Small (sm)**: 32px height - Compact UI elements
- **Medium (md)**: 40px height - Standard headers
- **Large (lg)**: 48px height - Hero sections, marketing

## Color Consistency

- Primary Blue: `#2563EB` (blue-600)
- Text Dark: `#111827` (gray-900)
- Text Light: `#FFFFFF` (white)
- Background Light: `#F3F4F6` (gray-100)
- Background Dark: `#1F2937` (gray-800)

## Implementation Examples

### Desktop Header
```tsx
<header className="border-b">
  <div className="container mx-auto px-4 h-16 flex items-center">
    <Logo variant="full" size="md" />
  </div>
</header>
```

### Mobile Header
```tsx
<header className="border-b md:hidden">
  <div className="px-4 h-14 flex items-center">
    <Logo variant="compact" />
  </div>
</header>
```

### App Icon
```tsx
<link rel="icon" href="/favicon.ico" />
<!-- Generated from Logo variant="icon" -->
```

## Responsive Usage

```tsx
// Responsive logo component
function ResponsiveLogo() {
  return (
    <>
      {/* Mobile */}
      <div className="block sm:hidden">
        <Logo variant="compact" />
      </div>
      
      {/* Tablet/Desktop */}
      <div className="hidden sm:block">
        <Logo variant="full" size="md" />
      </div>
    </>
  )
}
```

## Don'ts

- Don't modify the colors
- Don't stretch or distort
- Don't add effects or shadows beyond the designed ones
- Don't use the old "H" logo anywhere
- Don't mix variants (e.g., icon with full text separately)

## File Exports Needed

1. **Favicon**: 32x32, 16x16 (from icon variant)
2. **Apple Touch**: 180x180 (from icon variant)
3. **OG Image**: 1200x630 (full variant centered)
4. **PWA Icons**: 192x192, 512x512 (from icon variant)