import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import path from 'path'

const TEST_USER = {
  email: 'test@hangjegyzet.hu',
  password: 'Test123456!',
  organizationId: 'test-org-123'
}

// Test audio files with different characteristics
const TEST_AUDIO_FILES = {
  clear: path.join(__dirname, '../fixtures/clear-audio.mp3'), // Good quality, 5 min
  noisy: path.join(__dirname, '../fixtures/noisy-audio.mp3'), // Poor quality, 10 min
  meeting: path.join(__dirname, '../fixtures/business-meeting.mp3'), // Medium quality, 30 min
  short: path.join(__dirname, '../fixtures/short-clip.mp3'), // High quality, 2 min
}

test.describe('Mode-Based Transcription E2E Tests', () => {
  let supabase: any

  test.beforeAll(async () => {
    // Initialize test database connection
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Reset test user's usage
    await supabase.rpc('reset_test_user_usage', {
      p_organization_id: TEST_USER.organizationId
    })
  })

  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login')
    await page.fill('[name="email"]', TEST_USER.email)
    await page.fill('[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test.describe('Mode Selection', () => {
    test('should show mode selector when uploading file', async ({ page }) => {
      await page.click('button:has-text("Új meeting feltöltése")')
      
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.clear)
      
      // Mode selector should be visible
      await expect(page.locator('[data-testid="mode-selector"]')).toBeVisible()
      
      // All three modes should be shown
      await expect(page.locator('text=Fast')).toBeVisible()
      await expect(page.locator('text=Balanced')).toBeVisible()
      await expect(page.locator('text=Precision')).toBeVisible()
    })

    test('should recommend mode based on audio quality', async ({ page }) => {
      await page.click('button:has-text("Új meeting feltöltése")')
      
      // Upload noisy file
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.noisy)
      
      // Wait for quality analysis
      await page.waitForSelector('text=Hangminőség elemzés', { timeout: 10000 })
      
      // Should recommend Balanced or Precision for poor quality
      const recommendation = await page.locator('[data-testid="mode-recommendation"]')
      await expect(recommendation).toContainText(/Balanced|Precision/)
    })

    test('should disable unavailable modes based on plan', async ({ page }) => {
      // Set test user to 'indulo' plan (no Precision mode)
      await supabase
        .from('organizations')
        .update({ subscription_tier: 'indulo' })
        .eq('id', TEST_USER.organizationId)

      await page.reload()
      await page.click('button:has-text("Új meeting feltöltése")')
      
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.clear)
      
      // Precision mode should be disabled
      const precisionMode = await page.locator('[data-testid="mode-precision"]')
      await expect(precisionMode).toHaveAttribute('data-disabled', 'true')
    })
  })

  test.describe('Usage Tracking', () => {
    test('should track usage correctly for Fast mode', async ({ page }) => {
      // Get initial usage
      const initialUsage = await getOrganizationUsage(TEST_USER.organizationId)
      
      // Upload and process with Fast mode
      await uploadAndTranscribe(page, TEST_AUDIO_FILES.short, 'fast')
      
      // Wait for processing to complete
      await page.waitForSelector('text=Kész', { timeout: 60000 })
      
      // Check updated usage
      const newUsage = await getOrganizationUsage(TEST_USER.organizationId)
      expect(newUsage.fast).toBe(initialUsage.fast + 2) // 2 minute file
    })

    test('should enforce mode limits', async ({ page }) => {
      // Set test user near Fast mode limit
      await supabase.rpc('set_test_user_usage', {
        p_organization_id: TEST_USER.organizationId,
        p_mode: 'fast',
        p_minutes: 498 // 2 minutes under 500 limit
      })

      // Try to upload 5 minute file
      await page.click('button:has-text("Új meeting feltöltése")')
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.clear)
      
      // Select Fast mode
      await page.click('[data-testid="mode-fast"]')
      
      // Should show warning about insufficient minutes
      await expect(page.locator('text=Nincs elegendő perc')).toBeVisible()
    })

    test('should update usage dashboard in real-time', async ({ page }) => {
      // Open usage dashboard
      await page.goto('/dashboard')
      
      // Check initial Fast mode usage
      const initialFastUsage = await page.locator('[data-testid="fast-usage"]').textContent()
      
      // Upload in another tab
      const newPage = await page.context().newPage()
      await newPage.goto('/dashboard')
      await uploadAndTranscribe(newPage, TEST_AUDIO_FILES.short, 'fast')
      
      // Original page should update within 10 seconds
      await page.waitForFunction(
        (initial) => {
          const current = document.querySelector('[data-testid="fast-usage"]')?.textContent
          return current !== initial
        },
        initialFastUsage,
        { timeout: 10000 }
      )
    })
  })

  test.describe('Rate Limiting', () => {
    test('should enforce hourly rate limits', async ({ page }) => {
      // Set to Profi plan with 5/hour Precision limit
      await supabase
        .from('organizations')
        .update({ subscription_tier: 'profi' })
        .eq('id', TEST_USER.organizationId)

      // Upload 5 files quickly
      for (let i = 0; i < 5; i++) {
        await uploadAndTranscribe(page, TEST_AUDIO_FILES.short, 'precision')
        await page.goto('/dashboard') // Reset for next upload
      }

      // 6th upload should be rate limited
      await page.click('button:has-text("Új meeting feltöltése")')
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.short)
      await page.click('[data-testid="mode-precision"]')
      await page.click('button:has-text("Feltöltés")')
      
      // Should show rate limit error
      await expect(page.locator('text=Hourly limit')).toBeVisible()
    })

    test('should enforce concurrent limits for Fast mode', async ({ page, context }) => {
      const pages = []
      
      // Start 3 concurrent Fast mode transcriptions
      for (let i = 0; i < 3; i++) {
        const newPage = await context.newPage()
        pages.push(newPage)
        await newPage.goto('/dashboard')
        
        // Start upload but don't wait for completion
        uploadAndTranscribe(newPage, TEST_AUDIO_FILES.meeting, 'fast')
      }

      // 4th concurrent should fail
      await page.click('button:has-text("Új meeting feltöltése")')
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.short)
      await page.click('[data-testid="mode-fast"]')
      await page.click('button:has-text("Feltöltés")')
      
      // Should show concurrent limit error
      await expect(page.locator('text=concurrent fast transcriptions')).toBeVisible()
      
      // Cleanup
      for (const p of pages) {
        await p.close()
      }
    })
  })

  test.describe('Mode Processing Differences', () => {
    test('Fast mode should complete quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await uploadAndTranscribe(page, TEST_AUDIO_FILES.short, 'fast')
      await page.waitForSelector('text=Kész', { timeout: 60000 })
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(30000) // Should complete within 30 seconds
    })

    test('Balanced mode should include enhancements', async ({ page }) => {
      await uploadAndTranscribe(page, TEST_AUDIO_FILES.clear, 'balanced')
      await page.waitForSelector('text=Kész', { timeout: 120000 })
      
      // Click on the meeting to view details
      await page.click('button:has-text("Megnyitás")')
      
      // Check for enhanced features
      await expect(page.locator('[data-testid="vocabulary-enhanced"]')).toBeVisible()
      await expect(page.locator('[data-testid="speaker-labels"]')).toBeVisible()
    })

    test('Precision mode should have highest accuracy', async ({ page }) => {
      await uploadAndTranscribe(page, TEST_AUDIO_FILES.meeting, 'precision')
      await page.waitForSelector('text=Kész', { timeout: 300000 }) // Longer timeout
      
      // View meeting details
      await page.click('button:has-text("Megnyitás")')
      
      // Check for precision features
      await expect(page.locator('[data-testid="accuracy-score"]')).toContainText(/97|98|99/)
      await expect(page.locator('[data-testid="ai-enhanced"]')).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle upload failures gracefully', async ({ page }) => {
      // Intercept upload request and fail it
      await page.route('**/api/meetings/upload', route => {
        route.abort('failed')
      })

      await page.click('button:has-text("Új meeting feltöltése")')
      const fileInput = await page.locator('input[type="file"]')
      await fileInput.setInputFiles(TEST_AUDIO_FILES.clear)
      await page.click('[data-testid="mode-balanced"]')
      await page.click('button:has-text("Feltöltés")')
      
      // Should show error message
      await expect(page.locator('text=Feltöltés sikertelen')).toBeVisible()
      
      // Dialog should remain open for retry
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    })

    test('should handle processing failures', async ({ page }) => {
      // Mock a processing failure
      await page.route('**/api/jobs/transcription', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Processing failed' })
        })
      })

      await uploadAndTranscribe(page, TEST_AUDIO_FILES.short, 'fast')
      
      // Should show failed status
      await page.waitForSelector('text=Sikertelen', { timeout: 60000 })
      
      // Should allow retry
      await expect(page.locator('button:has-text("Újra")')).toBeVisible()
    })
  })

  test.describe('Usage Forecast', () => {
    test('should show accurate usage predictions', async ({ page }) => {
      // Create historical usage pattern
      const dates = []
      for (let i = 7; i >= 0; i--) {
        dates.push(new Date(Date.now() - i * 24 * 60 * 60 * 1000))
      }
      
      // Simulate consistent daily usage
      for (const date of dates) {
        await supabase.rpc('add_test_usage', {
          p_organization_id: TEST_USER.organizationId,
          p_date: date.toISOString(),
          p_fast: 20,
          p_balanced: 10,
          p_precision: 2
        })
      }

      await page.goto('/dashboard')
      
      // Check forecast component
      await expect(page.locator('[data-testid="usage-forecast"]')).toBeVisible()
      
      // Should show projections
      await expect(page.locator('text=Várható összesen')).toBeVisible()
      
      // Should warn if on track to exceed limits
      const balancedProjection = await page.locator('[data-testid="balanced-projection"]').textContent()
      if (parseInt(balancedProjection!) > 100) { // Indulo plan limit
        await expect(page.locator('text=túl fogja lépni')).toBeVisible()
      }
    })
  })
})

// Helper functions
async function uploadAndTranscribe(page: any, filePath: string, mode: string) {
  await page.click('button:has-text("Új meeting feltöltése")')
  
  const fileInput = await page.locator('input[type="file"]')
  await fileInput.setInputFiles(filePath)
  
  // Wait for quality analysis
  await page.waitForSelector('[data-testid="mode-selector"]')
  
  // Select mode
  await page.click(`[data-testid="mode-${mode}"]`)
  
  // Upload
  await page.click('button:has-text("Feltöltés")')
  
  // Wait for redirect to meeting page
  await page.waitForURL(/\/meetings\/[a-z0-9-]+/)
}

async function getOrganizationUsage(organizationId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data } = await supabase
    .rpc('get_current_month_usage', { p_organization_id: organizationId })
    .single()
  
  return data || { fast: 0, balanced: 0, precision: 0 }
}