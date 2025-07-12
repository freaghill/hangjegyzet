import { test, expect } from '@playwright/test'

test.describe('Export Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'testpassword')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')
  })
  
  test('should export meeting as PDF with branding', async ({ page }) => {
    // Navigate to a meeting
    await page.goto('/meetings/meet-123')
    await page.waitForSelector('h1:has-text("Test Meeting")')
    
    // Click export button
    await page.click('button:has-text("Exportálás")')
    
    // Select PDF format
    await page.click('input[value="pdf"]')
    
    // Select template
    await page.selectOption('select[name="template"]', 'business_summary')
    
    // Configure export options
    await page.check('input[name="includeTranscript"]')
    await page.check('input[name="includeSummary"]')
    await page.check('input[name="includeActionItems"]')
    
    // Start export
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("PDF letöltése")')
    
    // Wait for download
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/meeting-export-.*\.pdf/)
    
    // Verify success message
    await expect(page.locator('text=Export sikeresen elkészült')).toBeVisible()
  })
  
  test('should configure organization branding', async ({ page }) => {
    // Navigate to branding settings
    await page.goto('/dashboard/settings/branding')
    
    // Update primary color
    await page.fill('input[name="primaryColor"]', '#ff0000')
    
    // Upload logo
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test/fixtures/logo.png')
    
    // Wait for upload confirmation
    await expect(page.locator('text=Logó feltöltve')).toBeVisible()
    
    // Switch to header/footer tab
    await page.click('button:has-text("Fejléc/Lábléc")')
    
    // Configure header
    await page.fill('input[name="headerText"]', 'Bizalmas dokumentum')
    await page.check('input[name="includePageNumbers"]')
    
    // Configure footer
    await page.fill('input[name="footerText"]', '© 2024 Test Company')
    await page.check('input[name="includeDate"]')
    
    // Save settings
    await page.click('button:has-text("Mentés")')
    
    // Verify success
    await expect(page.locator('text=Márkabeállítások mentve')).toBeVisible()
  })
  
  test('should preview branded PDF before export', async ({ page }) => {
    // Navigate to meeting
    await page.goto('/meetings/meet-123')
    
    // Open export dialog
    await page.click('button:has-text("Exportálás")')
    
    // Click preview
    await page.click('button:has-text("Előnézet")')
    
    // Wait for preview to load
    await page.waitForSelector('iframe[title="PDF előnézet"]')
    
    // Verify preview contains branding
    const previewFrame = page.frameLocator('iframe[title="PDF előnézet"]')
    await expect(previewFrame.locator('img[alt="Logo"]')).toBeVisible()
    await expect(previewFrame.locator('text=Bizalmas dokumentum')).toBeVisible()
  })
  
  test('should handle export errors gracefully', async ({ page }) => {
    // Navigate to meeting
    await page.goto('/meetings/meet-123')
    
    // Mock API error
    await page.route('**/api/meetings/*/export', (route) => {
      route.fulfill({
        status: 500,
        json: { error: 'Export failed' },
      })
    })
    
    // Try to export
    await page.click('button:has-text("Exportálás")')
    await page.click('button:has-text("PDF letöltése")')
    
    // Verify error message
    await expect(page.locator('text=Hiba történt az exportálás során')).toBeVisible()
  })
  
  test('should export multiple meetings in bulk', async ({ page }) => {
    // Navigate to meetings list
    await page.goto('/meetings')
    
    // Select multiple meetings
    await page.check('input[data-meeting-id="meet-123"]')
    await page.check('input[data-meeting-id="meet-124"]')
    await page.check('input[data-meeting-id="meet-125"]')
    
    // Click bulk export
    await page.click('button:has-text("Kijelöltek exportálása")')
    
    // Configure bulk export
    await page.click('input[value="pdf"]')
    await page.selectOption('select[name="template"]', 'business_summary')
    
    // Start bulk export
    await page.click('button:has-text("Exportálás indítása")')
    
    // Wait for completion
    await expect(page.locator('text=3 meeting sikeresen exportálva')).toBeVisible({
      timeout: 30000,
    })
    
    // Verify download link
    await expect(page.locator('a:has-text("Letöltés (ZIP)")')).toBeVisible()
  })
})