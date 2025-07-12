import { describe, it, expect, beforeAll } from '@jest/globals'
import { calculateWER, calculateCER } from '@/lib/transcription/accuracy-metrics'
import { processTranscription } from '@/lib/jobs/transcription-processor'
import fs from 'fs/promises'
import path from 'path'

/**
 * Mode Accuracy Validation Tests
 * 
 * Validates that each transcription mode meets its advertised accuracy levels:
 * - Fast: 90-93%
 * - Balanced: 94-96%
 * - Precision: 97%+
 */

interface TestCase {
  audioFile: string
  referenceTranscript: string
  language: 'hu' | 'en'
  audioQuality: 'excellent' | 'good' | 'fair' | 'poor'
  expectedAccuracy: {
    fast: { min: number; max: number }
    balanced: { min: number; max: number }
    precision: { min: number; max: number }
  }
}

// Test cases with verified reference transcripts
const TEST_CASES: TestCase[] = [
  {
    audioFile: 'business-meeting-clear.mp3',
    referenceTranscript: 'business-meeting-clear.txt',
    language: 'hu',
    audioQuality: 'excellent',
    expectedAccuracy: {
      fast: { min: 91, max: 94 },
      balanced: { min: 95, max: 97 },
      precision: { min: 97, max: 99 }
    }
  },
  {
    audioFile: 'technical-discussion-noisy.mp3',
    referenceTranscript: 'technical-discussion-noisy.txt',
    language: 'hu',
    audioQuality: 'fair',
    expectedAccuracy: {
      fast: { min: 88, max: 92 },
      balanced: { min: 93, max: 95 },
      precision: { min: 96, max: 98 }
    }
  },
  {
    audioFile: 'legal-meeting-multiple-speakers.mp3',
    referenceTranscript: 'legal-meeting-multiple-speakers.txt',
    language: 'hu',
    audioQuality: 'good',
    expectedAccuracy: {
      fast: { min: 90, max: 93 },
      balanced: { min: 94, max: 96 },
      precision: { min: 97, max: 99 }
    }
  },
  {
    audioFile: 'medical-consultation.mp3',
    referenceTranscript: 'medical-consultation.txt',
    language: 'hu',
    audioQuality: 'good',
    expectedAccuracy: {
      fast: { min: 89, max: 92 },
      balanced: { min: 93, max: 95 },
      precision: { min: 97, max: 99 }
    }
  }
]

// Accuracy calculation functions
export function calculateAccuracy(reference: string, hypothesis: string): number {
  const wer = calculateWER(reference, hypothesis)
  return Math.max(0, (1 - wer) * 100)
}

export function calculateDetailedMetrics(reference: string, hypothesis: string) {
  const words = {
    reference: reference.toLowerCase().split(/\s+/),
    hypothesis: hypothesis.toLowerCase().split(/\s+/)
  }
  
  // Calculate various metrics
  const wer = calculateWER(reference, hypothesis)
  const cer = calculateCER(reference, hypothesis)
  
  // Calculate semantic accuracy (using simple word overlap for now)
  const refSet = new Set(words.reference)
  const hypSet = new Set(words.hypothesis)
  const intersection = new Set([...refSet].filter(x => hypSet.has(x)))
  const union = new Set([...refSet, ...hypSet])
  const semanticAccuracy = intersection.size / union.size
  
  // Calculate specific error types
  const errors = analyzeErrors(words.reference, words.hypothesis)
  
  return {
    accuracy: Math.max(0, (1 - wer) * 100),
    wer: wer * 100,
    cer: cer * 100,
    semanticAccuracy: semanticAccuracy * 100,
    errors,
    wordCount: words.reference.length,
    characterCount: reference.length
  }
}

function analyzeErrors(reference: string[], hypothesis: string[]) {
  let substitutions = 0
  let deletions = 0
  let insertions = 0
  
  // Simple error analysis (Levenshtein distance based)
  const m = reference.length
  const n = hypothesis.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  // Initialize
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (reference[i - 1] === hypothesis[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }
  
  // Backtrack to count error types
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && reference[i - 1] === hypothesis[j - 1]) {
      i--
      j--
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++
      i--
      j--
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++
      i--
    } else {
      insertions++
      j--
    }
  }
  
  return { substitutions, deletions, insertions }
}

describe('Mode Accuracy Validation', () => {
  let testDataPath: string
  
  beforeAll(() => {
    testDataPath = path.join(__dirname, '../fixtures/accuracy-test-data')
  })
  
  describe.each(TEST_CASES)('Test Case: $audioFile', (testCase) => {
    let referenceTranscript: string
    
    beforeAll(async () => {
      // Load reference transcript
      referenceTranscript = await fs.readFile(
        path.join(testDataPath, testCase.referenceTranscript),
        'utf-8'
      )
    })
    
    describe.each(['fast', 'balanced', 'precision'] as const)('%s mode', (mode) => {
      it(`should achieve ${testCase.expectedAccuracy[mode].min}-${testCase.expectedAccuracy[mode].max}% accuracy`, async () => {
        // Process audio with specified mode
        const audioPath = path.join(testDataPath, testCase.audioFile)
        const result = await processTranscription({
          audioPath,
          mode,
          language: testCase.language,
          options: getModeOptions(mode)
        })
        
        // Calculate accuracy metrics
        const metrics = calculateDetailedMetrics(
          referenceTranscript,
          result.transcript
        )
        
        // Log detailed results
        console.log(`\n${mode.toUpperCase()} Mode Results for ${testCase.audioFile}:`)
        console.log(`Accuracy: ${metrics.accuracy.toFixed(2)}%`)
        console.log(`WER: ${metrics.wer.toFixed(2)}%`)
        console.log(`CER: ${metrics.cer.toFixed(2)}%`)
        console.log(`Semantic Accuracy: ${metrics.semanticAccuracy.toFixed(2)}%`)
        console.log(`Errors: S=${metrics.errors.substitutions}, D=${metrics.errors.deletions}, I=${metrics.errors.insertions}`)
        
        // Assert accuracy is within expected range
        expect(metrics.accuracy).toBeGreaterThanOrEqual(testCase.expectedAccuracy[mode].min)
        expect(metrics.accuracy).toBeLessThanOrEqual(testCase.expectedAccuracy[mode].max)
        
        // Additional quality checks
        if (mode === 'precision') {
          // Precision mode should have minimal errors
          const totalErrors = metrics.errors.substitutions + 
                            metrics.errors.deletions + 
                            metrics.errors.insertions
          const errorRate = totalErrors / metrics.wordCount
          expect(errorRate).toBeLessThan(0.03) // Less than 3% error rate
        }
      }, 300000) // 5 minute timeout for processing
      
      if (mode !== 'fast') {
        it('should outperform lower modes', async () => {
          const lowerMode = mode === 'balanced' ? 'fast' : 'balanced'
          
          // Process with both modes
          const [currentResult, lowerResult] = await Promise.all([
            processTranscription({
              audioPath: path.join(testDataPath, testCase.audioFile),
              mode,
              language: testCase.language,
              options: getModeOptions(mode)
            }),
            processTranscription({
              audioPath: path.join(testDataPath, testCase.audioFile),
              mode: lowerMode,
              language: testCase.language,
              options: getModeOptions(lowerMode)
            })
          ])
          
          const currentMetrics = calculateDetailedMetrics(
            referenceTranscript,
            currentResult.transcript
          )
          
          const lowerMetrics = calculateDetailedMetrics(
            referenceTranscript,
            lowerResult.transcript
          )
          
          // Current mode should have better accuracy
          expect(currentMetrics.accuracy).toBeGreaterThan(lowerMetrics.accuracy)
          
          // Log improvement
          const improvement = currentMetrics.accuracy - lowerMetrics.accuracy
          console.log(`${mode} mode improvement over ${lowerMode}: +${improvement.toFixed(2)}%`)
        })
      }
    })
  })
  
  describe('Mode-specific features', () => {
    it('Fast mode should complete quickly', async () => {
      const startTime = Date.now()
      
      await processTranscription({
        audioPath: path.join(testDataPath, TEST_CASES[0].audioFile),
        mode: 'fast',
        language: 'hu',
        options: getModeOptions('fast')
      })
      
      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(30000) // Under 30 seconds for fast mode
    })
    
    it('Balanced mode should include vocabulary enhancement', async () => {
      const result = await processTranscription({
        audioPath: path.join(testDataPath, TEST_CASES[0].audioFile),
        mode: 'balanced',
        language: 'hu',
        options: getModeOptions('balanced')
      })
      
      // Check for enhanced vocabulary markers
      expect(result.metadata.vocabularyEnhanced).toBe(true)
      expect(result.metadata.enhancedTerms).toBeGreaterThan(0)
    })
    
    it('Precision mode should include AI post-processing', async () => {
      const result = await processTranscription({
        audioPath: path.join(testDataPath, TEST_CASES[0].audioFile),
        mode: 'precision',
        language: 'hu',
        options: getModeOptions('precision')
      })
      
      // Check for AI processing markers
      expect(result.metadata.aiProcessed).toBe(true)
      expect(result.metadata.multiPassCount).toBeGreaterThanOrEqual(2)
      expect(result.confidence).toBeGreaterThan(0.95)
    })
  })
  
  describe('Edge cases', () => {
    it('should handle very short audio files', async () => {
      const result = await processTranscription({
        audioPath: path.join(testDataPath, 'short-10s.mp3'),
        mode: 'balanced',
        language: 'hu',
        options: getModeOptions('balanced')
      })
      
      expect(result.transcript.length).toBeGreaterThan(0)
      expect(result.duration).toBeLessThan(15) // Should be close to actual duration
    })
    
    it('should handle audio with long silences', async () => {
      const result = await processTranscription({
        audioPath: path.join(testDataPath, 'audio-with-silences.mp3'),
        mode: 'balanced',
        language: 'hu',
        options: getModeOptions('balanced')
      })
      
      // Should not include excessive filler or repeated words
      const words = result.transcript.split(/\s+/)
      const uniqueWords = new Set(words)
      expect(uniqueWords.size / words.length).toBeGreaterThan(0.7) // 70% unique words
    })
    
    it('should handle multiple speakers correctly', async () => {
      const result = await processTranscription({
        audioPath: path.join(testDataPath, 'multiple-speakers.mp3'),
        mode: 'precision',
        language: 'hu',
        options: getModeOptions('precision')
      })
      
      // Should identify multiple speakers
      expect(result.speakers.length).toBeGreaterThan(1)
      expect(result.segments.some(s => s.speaker !== result.segments[0].speaker)).toBe(true)
    })
  })
})

function getModeOptions(mode: 'fast' | 'balanced' | 'precision') {
  const baseOptions = {
    enableAccuracyMonitoring: true,
    language: 'hu'
  }
  
  switch (mode) {
    case 'fast':
      return {
        ...baseOptions,
        enableEnhancedProcessing: false,
        enablePreprocessing: false,
        enableMultiPass: false,
        enableVocabularyEnhancement: false
      }
    
    case 'balanced':
      return {
        ...baseOptions,
        enableEnhancedProcessing: true,
        enablePreprocessing: true,
        enableMultiPass: false,
        enableVocabularyEnhancement: true
      }
    
    case 'precision':
      return {
        ...baseOptions,
        enableEnhancedProcessing: true,
        enablePreprocessing: true,
        enableMultiPass: true,
        enableVocabularyEnhancement: true,
        multiPassCount: 2
      }
  }
}