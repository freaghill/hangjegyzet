import { test, expect } from '@playwright/test'
import { createMockUser } from '@/__tests__/test-utils'

test.describe('User Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/signup')
  })

  test('should successfully sign up a new user', async ({ page }) => {
    // Fill in the signup form
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'Test123!')
    await page.fill('input[name="confirmPassword"]', 'Test123!')

    // Accept terms
    await page.check('input[name="acceptTerms"]')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Verify welcome message
    await expect(page.locator('text=Üdvözöljük')).toBeVisible()
    
    // Verify user menu shows correct name
    await expect(page.locator('[data-testid="user-menu"]')).toContainText('Test User')
  })

  test('should show validation errors for invalid input', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Check validation messages
    await expect(page.locator('text=A név megadása kötelező')).toBeVisible()
    await expect(page.locator('text=Az email cím megadása kötelező')).toBeVisible()
    await expect(page.locator('text=A jelszó megadása kötelező')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=Érvénytelen email cím')).toBeVisible()
  })

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[name="password"]', '123')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=A jelszónak legalább 8 karakter hosszúnak kell lennie')).toBeVisible()
  })

  test('should validate password confirmation', async ({ page }) => {
    await page.fill('input[name="password"]', 'Test123!')
    await page.fill('input[name="confirmPassword"]', 'Different123!')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=A jelszavak nem egyeznek')).toBeVisible()
  })

  test('should require terms acceptance', async ({ page }) => {
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.fill('input[name="confirmPassword"]', 'Test123!')

    // Don't check terms
    await page.click('button[type="submit"]')

    await expect(page.locator('text=El kell fogadnia a felhasználási feltételeket')).toBeVisible()
  })

  test('should handle duplicate email error', async ({ page }) => {
    // Use an email that already exists
    await page.fill('input[name="name"]', 'Test User')
    await page.fill('input[name="email"]', 'existing@example.com')
    await page.fill('input[name="password"]', 'Test123!')
    await page.fill('input[name="confirmPassword"]', 'Test123!')
    await page.check('input[name="acceptTerms"]')

    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(page.locator('text=Ez az email cím már használatban van')).toBeVisible()
  })

  test('should navigate to sign in page', async ({ page }) => {
    await page.click('text=Már van fiókja? Jelentkezzen be')
    await expect(page).toHaveURL('/auth/signin')
  })

  test('should be mobile responsive', async ({ page, isMobile }) => {
    if (isMobile) {
      // Check that form is properly displayed on mobile
      await expect(page.locator('form')).toBeVisible()
      await expect(page.locator('input[name="email"]')).toBeVisible()
      
      // Check that layout is vertical on mobile
      const formWidth = await page.locator('form').boundingBox()
      expect(formWidth?.width).toBeLessThan(500)
    }
  })
})