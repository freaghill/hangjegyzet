import { test as setup } from '@playwright/test'

const authFile = './__tests__/e2e/auth.json'

setup('authenticate', async ({ page }) => {
  // Go to sign in page
  await page.goto('/auth/signin')
  
  // Sign in with test user
  await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com')
  await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!')
  
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard')
  
  // Save authentication state
  await page.context().storageState({ path: authFile })
})