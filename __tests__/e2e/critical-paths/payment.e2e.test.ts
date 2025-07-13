import { test, expect } from '@playwright/test'

test.describe('Payment Flow', () => {
  test.use({
    storageState: './__tests__/e2e/auth.json', // Authenticated state
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/pricing')
  })

  test('should complete payment for Pro plan', async ({ page }) => {
    // Select Pro Monthly plan
    await page.click('[data-testid="plan-pro-monthly"]')
    
    // Click subscribe button
    await page.click('button[data-testid="subscribe-pro-monthly"]')

    // Should navigate to checkout
    await expect(page).toHaveURL('/checkout/pro-monthly')

    // Verify plan details
    await expect(page.locator('text=Pro csomag - Havi')).toBeVisible()
    await expect(page.locator('text=9 990 Ft/hó')).toBeVisible()

    // Fill billing information
    await page.fill('input[name="billingName"]', 'Teszt Vállalat Kft.')
    await page.fill('input[name="taxNumber"]', '12345678-2-42')
    await page.fill('input[name="billingAddress"]', 'Teszt utca 123.')
    await page.fill('input[name="billingCity"]', 'Budapest')
    await page.fill('input[name="billingZip"]', '1111')

    // Select payment method
    await page.click('[data-testid="payment-method-card"]')

    // Accept terms
    await page.check('input[name="acceptTerms"]')

    // Click pay button
    await page.click('button[data-testid="submit-payment"]')

    // Should redirect to Barion payment page (mocked in test)
    await page.waitForURL(/barion\.com\/pay/, { timeout: 10000 })

    // Simulate successful payment callback
    await page.goto('/payment/callback?paymentId=test-payment&status=Succeeded')

    // Should show success page
    await expect(page.locator('text=Sikeres fizetés!')).toBeVisible()
    await expect(page.locator('text=Pro csomag aktiválva')).toBeVisible()

    // Should receive email confirmation (check in test email inbox)
    
    // Verify subscription is active in dashboard
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="subscription-badge"]')).toContainText('Pro')
  })

  test('should handle failed payment', async ({ page }) => {
    await page.click('[data-testid="plan-pro-monthly"]')
    await page.click('button[data-testid="subscribe-pro-monthly"]')

    // Fill minimal required info
    await page.fill('input[name="billingName"]', 'Test User')
    await page.check('input[name="acceptTerms"]')
    await page.click('button[data-testid="submit-payment"]')

    // Simulate failed payment callback
    await page.goto('/payment/callback?paymentId=test-payment&status=Failed')

    // Should show error page
    await expect(page.locator('text=Sikertelen fizetés')).toBeVisible()
    await expect(page.locator('text=A tranzakció nem sikerült')).toBeVisible()

    // Should show retry button
    await expect(page.locator('button[data-testid="retry-payment"]')).toBeVisible()
  })

  test('should validate billing information', async ({ page }) => {
    await page.click('[data-testid="plan-pro-monthly"]')
    await page.click('button[data-testid="subscribe-pro-monthly"]')

    // Try to submit without filling required fields
    await page.click('button[data-testid="submit-payment"]')

    // Should show validation errors
    await expect(page.locator('text=A számlázási név megadása kötelező')).toBeVisible()
    await expect(page.locator('text=El kell fogadnia a feltételeket')).toBeVisible()
  })

  test('should apply discount code', async ({ page }) => {
    await page.click('[data-testid="plan-pro-yearly"]')
    await page.click('button[data-testid="subscribe-pro-yearly"]')

    // Click discount code link
    await page.click('text=Van kedvezmény kódja?')

    // Enter discount code
    await page.fill('input[name="discountCode"]', 'TESTCODE20')
    await page.click('button[data-testid="apply-discount"]')

    // Should show discount applied
    await expect(page.locator('text=20% kedvezmény alkalmazva')).toBeVisible()
    
    // Price should be updated
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('95 904 Ft')
  })

  test('should show plan comparison', async ({ page }) => {
    // Check that all plans are displayed
    await expect(page.locator('[data-testid="plan-basic-monthly"]')).toBeVisible()
    await expect(page.locator('[data-testid="plan-pro-monthly"]')).toBeVisible()
    await expect(page.locator('[data-testid="plan-pro-yearly"]')).toBeVisible()

    // Check feature comparison
    await expect(page.locator('text=5 meeting/hó')).toBeVisible() // Basic
    await expect(page.locator('text=Korlátlan meeting')).toBeVisible() // Pro

    // Toggle yearly pricing
    await page.click('[data-testid="pricing-toggle-yearly"]')
    
    // Should show yearly prices and savings
    await expect(page.locator('text=2 hónap ingyen')).toBeVisible()
  })

  test('should handle subscription upgrade', async ({ page }) => {
    // Assume user has Basic plan
    await page.goto('/account/subscription')
    
    // Should show current plan
    await expect(page.locator('text=Jelenlegi csomag: Alap')).toBeVisible()

    // Click upgrade button
    await page.click('button[data-testid="upgrade-plan"]')

    // Should navigate to pricing with upgrade context
    await expect(page).toHaveURL('/pricing?upgrade=true')

    // Pro plan should be highlighted
    await expect(page.locator('[data-testid="plan-pro-monthly"]')).toHaveClass(/recommended/)

    // Click upgrade to Pro
    await page.click('button[data-testid="upgrade-to-pro-monthly"]')

    // Should show prorated amount
    await expect(page.locator('text=Arányosított összeg')).toBeVisible()
  })

  test('should download invoice after payment', async ({ page }) => {
    // Navigate to completed payment
    await page.goto('/account/invoices')

    // Should list invoices
    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible()
    
    // Click download on first invoice
    const downloadPromise = page.waitForEvent('download')
    await page.click('[data-testid="download-invoice-1"]')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toMatch(/HJ-\d{4}-\d+\.pdf/)
  })

  test('should handle payment method update', async ({ page }) => {
    await page.goto('/account/payment-methods')

    // Click add payment method
    await page.click('button[data-testid="add-payment-method"]')

    // Should show payment method form
    await expect(page.locator('text=Új fizetési mód hozzáadása')).toBeVisible()

    // Select card
    await page.click('[data-testid="payment-type-card"]')

    // Save (would redirect to Barion in production)
    await page.click('button[data-testid="save-payment-method"]')

    // Should show success message
    await expect(page.locator('text=Fizetési mód sikeresen hozzáadva')).toBeVisible()
  })
})