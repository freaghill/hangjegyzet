# Testing Guide

## Overview
This guide covers the comprehensive test suite for HangJegyzet.AI, including unit tests, integration tests, and end-to-end tests.

## Test Structure

```
__tests__/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for API and services
├── e2e/              # End-to-end tests with Playwright
├── load/             # Performance and load tests
└── fixtures/         # Test data and mock files

test/
├── utils/            # Test utilities and helpers
│   ├── test-utils.tsx    # React testing utilities
│   ├── factories.ts      # Test data factories
│   └── supabase-mock.ts  # Supabase mocking utilities
└── setup/            # Test setup files
```

## Running Tests

### Unit and Integration Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test transcription.processor.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should export"
```

### E2E Tests
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npx playwright test

# Run E2E tests in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test export-flow.test.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Test environment: `jest-environment-jsdom`
- Module name mapping for `@/` imports
- Setup file: `jest.setup.js`
- Coverage thresholds can be configured

### Jest Setup (`jest.setup.js`)
- Polyfills for Node.js environment
- Mock environment variables
- Mock external dependencies (Supabase, OpenAI, SendGrid, etc.)
- Mock Next.js navigation

## Writing Tests

### Unit Tests

Example component test:
```typescript
import { render, screen, fireEvent } from '@/test/utils/test-utils'
import { MyComponent } from '@/components/my-component'

describe('MyComponent', () => {
  it('should render and handle click', async () => {
    const handleClick = jest.fn()
    
    render(<MyComponent onClick={handleClick} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalled()
  })
})
```

### Integration Tests

Example API test:
```typescript
import { POST } from '@/app/api/meetings/[id]/export/route'
import { createMockSupabaseClient } from '@/test/utils/supabase-mock'

describe('Export API', () => {
  it('should export meeting', async () => {
    const mockSupabase = createMockSupabaseClient()
    
    const response = await POST(mockRequest, {
      params: { id: 'meet-123' }
    })
    
    expect(response.status).toBe(200)
  })
})
```

### E2E Tests

Example Playwright test:
```typescript
import { test, expect } from '@playwright/test'

test('should export meeting', async ({ page }) => {
  await page.goto('/meetings/meet-123')
  await page.click('button:has-text("Export")')
  
  const download = await page.waitForEvent('download')
  expect(download.suggestedFilename()).toContain('.pdf')
})
```

## Test Utilities

### Test Data Factories
Use factories to create consistent test data:
```typescript
import { createMockMeeting, createMockUser } from '@/test/utils/factories'

const meeting = createMockMeeting({
  title: 'Custom Meeting',
  duration_seconds: 1800
})
```

### Supabase Mocking
Mock Supabase operations:
```typescript
import { createMockSupabaseClient, mockAuthState } from '@/test/utils/supabase-mock'

const mockSupabase = createMockSupabaseClient()
mockAuthState(mockSupabase, mockUser, mockSession)
```

### Custom Render
Use custom render for components that need providers:
```typescript
import { render } from '@/test/utils/test-utils'

// This includes QueryClientProvider and other providers
render(<MyComponent />)
```

## Testing Best Practices

### 1. Test Structure
- Use descriptive test names
- Group related tests with `describe`
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests focused and isolated

### 2. Mocking
- Mock external dependencies
- Use factory functions for test data
- Reset mocks between tests
- Avoid over-mocking

### 3. Async Testing
- Use `waitFor` for async operations
- Handle promises properly
- Test loading and error states
- Use proper timeouts

### 4. Component Testing
- Test user interactions
- Verify accessibility
- Test edge cases
- Check error boundaries

### 5. API Testing
- Test success and error responses
- Verify authentication
- Check rate limiting
- Test data validation

## Coverage Goals

Aim for the following coverage:
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

Critical paths should have 100% coverage:
- Authentication flows
- Payment processing
- Data export
- Transcription processing

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch
- Pre-deployment

GitHub Actions workflow:
```yaml
- name: Run tests
  run: |
    npm test -- --coverage
    npx playwright test
```

## Debugging Tests

### Jest Debugging
```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
npm test -- --runInBand transcription.test.ts
```

### Playwright Debugging
```bash
# Debug mode
npx playwright test --debug

# Show browser
npx playwright test --headed

# Slow motion
npx playwright test --slow-mo=1000
```

## Common Issues

### 1. Timeout Errors
- Increase timeout for slow operations
- Use `waitFor` with proper conditions
- Mock time-consuming operations

### 2. Flaky Tests
- Avoid hardcoded delays
- Use proper selectors
- Wait for specific conditions
- Mock external dependencies

### 3. Module Resolution
- Check import paths
- Verify jest configuration
- Clear jest cache if needed

## Performance Testing

For load testing:
```bash
# Run k6 load tests
k6 run __tests__/load/api-load.test.js

# Run with specific VUs
k6 run --vus 10 --duration 30s __tests__/load/api-load.test.js
```

## Security Testing

- Test authentication flows
- Verify authorization checks
- Test input validation
- Check for XSS vulnerabilities
- Verify CSRF protection

## Accessibility Testing

- Use `@testing-library/jest-dom` matchers
- Test keyboard navigation
- Verify ARIA attributes
- Check color contrast
- Test screen reader compatibility