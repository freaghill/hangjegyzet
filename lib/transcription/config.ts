/**
 * Enhanced Transcription Configuration
 * 
 * This file contains all configuration options for the enhanced transcription system.
 * Modify these settings to tune the transcription behavior for your organization.
 */

export const TranscriptionConfig = {
  // Audio Preprocessing Settings
  preprocessing: {
    // Noise reduction settings
    noiseReduction: {
      enabled: true,
      strength: -25, // dB, higher negative values = more aggressive
      highPassFreq: 80, // Hz, removes low-frequency noise
      lowPassFreq: 8000, // Hz, removes high-frequency noise
    },
    
    // Audio normalization
    normalization: {
      enabled: true,
      targetLoudness: -16, // LUFS
      truePeak: -1.5, // dB
      loudnessRange: 11, // LU
    },
    
    // Voice Activity Detection
    vad: {
      enabled: true,
      silenceThreshold: -30, // dB
      minSpeechDuration: 0.3, // seconds
      minSilenceDuration: 0.3, // seconds
    },
    
    // Audio enhancement for poor quality
    enhancement: {
      autoEnhance: true,
      compressionThreshold: -20, // dB
      compressionRatio: 4,
      compressionAttack: 5, // ms
      compressionRelease: 50, // ms
    },
  },

  // Multi-pass Transcription Settings
  multiPass: {
    // Default number of passes
    defaultPasses: 2,
    
    // Temperature settings for each pass
    temperatures: [0.0, 0.2, 0.4],
    
    // Minimum confidence to trigger additional passes
    confidenceThreshold: 0.7,
    
    // Maximum passes even if confidence is low
    maxPasses: 3,
  },

  // Vocabulary Enhancement Settings
  vocabulary: {
    // Maximum terms to include in prompt
    maxPromptTerms: 50,
    
    // Minimum confidence score for terms
    minTermConfidence: 0.7,
    
    // Context window for vocabulary matching (characters)
    contextWindow: 50,
    
    // Phonetic matching threshold
    phoneticThreshold: 0.8,
    
    // Auto-learning settings
    autoLearning: {
      enabled: true,
      minFrequency: 3, // Minimum occurrences to suggest new term
      confidenceBoost: 0.02, // Confidence increase per correct usage
      confidencePenalty: 0.05, // Confidence decrease per error
    },
  },

  // Claude Enhancement Settings
  claude: {
    enabled: true,
    model: 'claude-3-opus-20240229',
    maxTokens: 4000,
    temperature: 0,
    
    // Post-processing features
    features: {
      grammarCorrection: true,
      punctuationFix: true,
      capitalization: true,
      coherenceCheck: true,
      technicalTerms: true,
    },
  },

  // Parallel Processing Settings
  parallel: {
    // Minimum duration (seconds) to enable parallel processing
    minDuration: 300, // 5 minutes
    
    // Chunk settings
    chunkDuration: 180, // 3 minutes per chunk
    overlapDuration: 10, // 10 seconds overlap
    maxWorkers: 10,
  },

  // Accuracy Monitoring Settings
  accuracy: {
    // Enable automatic accuracy tracking
    enabled: true,
    
    // Quality thresholds
    qualityThresholds: {
      excellent: { minSNR: 30, maxWER: 0.05 },
      good: { minSNR: 20, maxWER: 0.10 },
      fair: { minSNR: 10, maxWER: 0.15 },
      poor: { minSNR: 0, maxWER: 1.0 },
    },
    
    // Report generation
    reporting: {
      autoGenerate: true,
      frequency: 'weekly', // 'daily', 'weekly', 'monthly'
      minTranscriptions: 10, // Minimum transcriptions for report
    },
  },

  // Language-specific Settings
  languages: {
    hu: {
      // Hungarian-specific settings
      name: 'Hungarian',
      whisperCode: 'hu',
      
      // Common speech patterns to handle
      patterns: {
        // Handle Hungarian "ö", "ü", "ő", "ű" variations
        vowelVariations: true,
        
        // Common filler words to optionally remove
        fillerWords: ['hát', 'izé', 'szóval', 'ugye', 'tehát'],
        
        // Business-specific abbreviations
        abbreviations: {
          'Kft': 'Korlátolt felelősségű társaság',
          'Zrt': 'Zártkörűen működő részvénytársaság',
          'Bt': 'Betéti társaság',
        },
      },
    },
    en: {
      // English settings
      name: 'English',
      whisperCode: 'en',
      patterns: {
        fillerWords: ['um', 'uh', 'like', 'you know'],
        abbreviations: {
          'Inc': 'Incorporated',
          'LLC': 'Limited Liability Company',
          'Corp': 'Corporation',
        },
      },
    },
  },

  // Performance Settings
  performance: {
    // Timeout settings (ms)
    timeouts: {
      chunk: 120000, // 2 minutes per chunk
      total: 600000, // 10 minutes total
      enhancement: 30000, // 30 seconds for Claude
    },
    
    // Retry settings
    retries: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000, // ms
    },
    
    // Caching
    cache: {
      vocabularyTTL: 300000, // 5 minutes
      errorPatternTTL: 3600000, // 1 hour
    },
  },

  // Cost Optimization Settings
  costOptimization: {
    // Skip enhancements for short audio
    minDurationForEnhancement: 60, // seconds
    
    // Use single pass for high-quality audio
    singlePassQualityThreshold: 'excellent',
    
    // Disable Claude for low-priority meetings
    claudePriorityThreshold: 'medium',
  },
}

// Helper function to get language-specific config
export function getLanguageConfig(languageCode: string) {
  return TranscriptionConfig.languages[languageCode as keyof typeof TranscriptionConfig.languages] 
    || TranscriptionConfig.languages.en
}

// Helper function to check if enhancement should be applied
export function shouldApplyEnhancement(
  duration: number,
  audioQuality: string,
  priority?: string
): {
  preprocessing: boolean
  multiPass: boolean
  claude: boolean
} {
  const config = TranscriptionConfig.costOptimization
  
  return {
    preprocessing: true, // Always preprocess
    multiPass: audioQuality !== config.singlePassQualityThreshold,
    claude: (
      duration >= config.minDurationForEnhancement &&
      (!priority || priority >= config.claudePriorityThreshold)
    ),
  }
}

// Export type for configuration
export type TranscriptionConfigType = typeof TranscriptionConfig