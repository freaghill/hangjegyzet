# Hangjegyzet Application Review Plan

## Phase 1: Navigation & 404 Analysis

### Command 1.1: Deep Route Analysis
```bash
/analyze --architecture --deep --forensic --seq \
  "Analyze all Next.js routes, navigation links, and identify broken paths causing 404 errors" \
  --files "app/**/*.tsx" "components/**/*.tsx" \
  --persona-architect \
  --evidence \
  --think-hard
```

### Command 1.2: Navigation Testing
```bash
/test --e2e --navigation --strict \
  "Test all navigation buttons and links for 404 errors, focusing on landing page and dashboard" \
  --edge-cases \
  --persona-qa \
  --monitor
```

### Command 1.3: Route Consistency Check
```bash
/scan --routes --links --strict \
  "Scan for hardcoded links that don't match actual routes" \
  --files "app/**/*.tsx" "components/**/*.tsx" \
  --c7
```

## Phase 2: Text & Translation Consistency

### Command 2.1: Hungarian Text Analysis
```bash
/analyze --content --hungarian --seq \
  "Analyze all Hungarian text for consistency, native quality, and proper translations" \
  --persona-translator \
  --deep \
  --evidence
```

### Command 2.2: Hardcoded Text Scan
```bash
/scan --i18n --text --strict \
  "Find all hardcoded text that should be in translation files or constants" \
  --files "app/**/*.tsx" "components/**/*.tsx" \
  --automated
```

### Command 2.3: Text Consistency Review
```bash
/review --content --consistency --strict \
  "Review text consistency across landing page and dashboard for tone, terminology, and style" \
  --files "app/page.tsx" "app/(dashboard)/**/*.tsx" "components/landing/**/*.tsx" \
  --persona-copywriter
```

## Phase 3: UI/UX Consistency

### Command 3.1: Component Analysis
```bash
/analyze --ui --visual --consistency \
  "Analyze UI components for design pattern consistency and proper styling" \
  --files "components/ui/**/*.tsx" "components/**/*.tsx" \
  --persona-designer \
  --deep
```

### Command 3.2: Button & Interactive Elements
```bash
/analyze --code --interactive --seq \
  "Find all buttons and interactive elements that might not be working properly" \
  --files "components/**/*.tsx" "app/**/*.tsx" \
  --persona-frontend \
  --evidence
```

### Command 3.3: Style Consistency
```bash
/scan --styles --patterns --strict \
  "Scan for inconsistent styling patterns, classes, and design tokens" \
  --files "**/*.tsx" "**/*.css" \
  --magic
```

## Phase 4: Landing Page Deep Dive

### Command 4.1: Landing Page Performance
```bash
/analyze --performance --lighthouse --strict \
  "Analyze landing page performance, accessibility, and SEO issues" \
  --files "app/page.tsx" "components/landing/**/*.tsx" \
  --monitor \
  --evidence
```

### Command 4.2: Landing Page UX
```bash
/review --ux --conversion --strict \
  "Review landing page for conversion optimization and user journey issues" \
  --files "app/page.tsx" "app/(marketing)/**/*.tsx" \
  --persona-designer \
  --business-value
```

### Command 4.3: CTA Analysis
```bash
/analyze --cta --effectiveness --seq \
  "Analyze all Call-to-Action buttons and their destinations" \
  --files "app/page.tsx" "components/landing/**/*.tsx" \
  --persona-marketer
```

## Phase 5: Dashboard Analysis

### Command 5.1: Dashboard Functionality
```bash
/analyze --dashboard --functionality --deep \
  "Analyze dashboard components for broken features and missing functionality" \
  --files "app/(dashboard)/**/*.tsx" "components/dashboard/**/*.tsx" \
  --persona-analyst \
  --seq
```

### Command 5.2: Dashboard Data Flow
```bash
/analyze --data-flow --state --forensic \
  "Trace data flow in dashboard to identify state management issues" \
  --files "app/(dashboard)/**/*.tsx" "lib/hooks/**/*.ts" \
  --c7 \
  --evidence
```

### Command 5.3: Dashboard UX
```bash
/test --ux --dashboard --interactive \
  "Test dashboard user experience and interactive elements" \
  --persona-qa \
  --edge-cases \
  --strict
```

## Phase 6: Comprehensive Fix Strategy

### Command 6.1: Create Fix Workflow
```bash
/chain:create "fix-hangjegyzet-issues" \
  --add "/analyze --architecture --deep --seq" \
  --add "/scan --security --owasp --strict" \
  --add "/improve --code --fix --validate" \
  --add "/test --e2e --critical-paths --monitor" \
  --save
```

### Command 6.2: Execute Fixes
```bash
/chain "fix-hangjegyzet-issues" \
  --monitor \
  --strict \
  --iterate \
  --threshold 100%
```

### Command 6.3: Continuous Improvement Loop
```bash
/loop --while "critical issues exist" --max 10 \
  "/improve --code --strict --fix --validate" \
  --monitor \
  --persona-refactorer
```

## Phase 7: Final Validation

### Command 7.1: Full Test Suite
```bash
/test --all --coverage --strict \
  "Run comprehensive test suite with coverage report" \
  --e2e \
  --unit \
  --integration \
  --monitor
```

### Command 7.2: Production Readiness
```bash
/analyze --production --readiness --evidence \
  "Analyze application readiness for production deployment" \
  --security \
  --performance \
  --reliability
```

## Execution Order

1. Start with Phase 1 to identify and fix navigation/404 issues
2. Move to Phase 2 for text consistency fixes
3. Execute Phase 3 for UI/UX improvements
4. Deep dive into Phase 4 (Landing) and Phase 5 (Dashboard)
5. Create comprehensive fix strategy in Phase 6
6. Validate with Phase 7

## Expected Outcomes

- All navigation links working without 404s
- Consistent, native-quality Hungarian text
- Unified design system across all pages
- Optimized landing page with clear CTAs
- Fully functional dashboard
- Production-ready codebase