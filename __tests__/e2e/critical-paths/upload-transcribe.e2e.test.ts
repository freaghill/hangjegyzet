import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('File Upload and Transcription Flow', () => {
  test.use({
    storageState: './__tests__/e2e/auth.json', // Authenticated state
  })

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should successfully upload and transcribe audio file', async ({ page }) => {
    // Click new meeting button
    await page.click('[data-testid="new-meeting-button"]')
    
    // Wait for upload modal
    await expect(page.locator('[data-testid="upload-modal"]')).toBeVisible()

    // Fill meeting details
    await page.fill('input[name="title"]', 'E2E Test Meeting')
    await page.fill('textarea[name="description"]', 'This is a test meeting for E2E testing')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-audio.mp3'))

    // Select transcription mode
    await page.click('[data-testid="mode-balanced"]')

    // Select language
    await page.selectOption('select[name="language"]', 'hu')

    // Start upload
    await page.click('button[data-testid="start-upload"]')

    // Wait for upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    
    // Wait for upload to complete (mock in test environment)
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 })

    // Should redirect to meeting page
    await expect(page).toHaveURL(/\/meetings\/[\w-]+/)

    // Wait for transcription to start
    await expect(page.locator('text=Átírás folyamatban')).toBeVisible()

    // In test environment, transcription completes quickly
    await page.waitForSelector('[data-testid="transcription-complete"]', { timeout: 60000 })

    // Verify transcription is displayed
    await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible()
    await expect(page.locator('[data-testid="transcription-text"]')).not.toBeEmpty()

    // Verify summary is generated
    await expect(page.locator('[data-testid="meeting-summary"]')).toBeVisible()

    // Verify key points are extracted
    await expect(page.locator('[data-testid="key-points"]')).toBeVisible()
    await expect(page.locator('[data-testid="key-points"] li')).toHaveCount(3, { timeout: 10000 })
  })

  test('should handle large file upload with chunking', async ({ page }) => {
    await page.click('[data-testid="new-meeting-button"]')
    
    await page.fill('input[name="title"]', 'Large File Test')
    
    // Upload large file (100MB mock)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/large-test-audio.mp3'))

    await page.click('button[data-testid="start-upload"]')

    // Verify chunked upload progress
    await expect(page.locator('[data-testid="chunk-progress"]')).toBeVisible()
    
    // Should show chunk numbers
    await expect(page.locator('text=/Chunk \\d+ of \\d+/')).toBeVisible()

    // Wait for completion
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 60000 })
  })

  test('should validate file type', async ({ page }) => {
    await page.click('[data-testid="new-meeting-button"]')
    
    // Try to upload invalid file type
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-document.pdf'))

    // Should show error
    await expect(page.locator('text=Nem támogatott fájltípus')).toBeVisible()
    
    // Upload button should be disabled
    await expect(page.locator('button[data-testid="start-upload"]')).toBeDisabled()
  })

  test('should allow pause and resume of upload', async ({ page }) => {
    await page.click('[data-testid="new-meeting-button"]')
    
    await page.fill('input[name="title"]', 'Pause Resume Test')
    
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-audio.mp3'))

    await page.click('button[data-testid="start-upload"]')

    // Wait for upload to start
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()

    // Pause upload
    await page.click('button[data-testid="pause-upload"]')
    await expect(page.locator('text=Szüneteltetve')).toBeVisible()

    // Resume upload
    await page.click('button[data-testid="resume-upload"]')
    await expect(page.locator('text=Feltöltés folyamatban')).toBeVisible()

    // Wait for completion
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 })
  })

  test('should handle upload errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/upload/**', route => route.abort('failed'))

    await page.click('[data-testid="new-meeting-button"]')
    
    await page.fill('input[name="title"]', 'Error Test')
    
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-audio.mp3'))

    await page.click('button[data-testid="start-upload"]')

    // Should show error message
    await expect(page.locator('text=Hiba történt a feltöltés során')).toBeVisible()
    
    // Should show retry button
    await expect(page.locator('button[data-testid="retry-upload"]')).toBeVisible()
  })

  test('should show transcription progress updates', async ({ page }) => {
    // Upload a file first
    await page.click('[data-testid="new-meeting-button"]')
    await page.fill('input[name="title"]', 'Progress Test')
    
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-audio.mp3'))
    
    await page.click('button[data-testid="start-upload"]')
    await page.waitForSelector('[data-testid="upload-complete"]', { timeout: 30000 })

    // On meeting page, check transcription progress
    await expect(page.locator('[data-testid="transcription-progress"]')).toBeVisible()
    
    // Should show percentage
    await expect(page.locator('text=/\\d+%/')).toBeVisible()
    
    // Should update progress
    const initialProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow')
    await page.waitForTimeout(2000)
    const updatedProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow')
    
    expect(Number(updatedProgress)).toBeGreaterThan(Number(initialProgress))
  })

  test('should allow downloading transcription', async ({ page }) => {
    // Navigate to existing meeting with transcription
    await page.goto('/meetings/test-meeting-with-transcription')

    // Wait for transcription to load
    await expect(page.locator('[data-testid="transcription-text"]')).toBeVisible()

    // Click export button
    await page.click('button[data-testid="export-transcription"]')

    // Select format
    await page.click('button[data-testid="export-pdf"]')

    // Start download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button[data-testid="confirm-export"]')
    const download = await downloadPromise

    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf')
  })
})