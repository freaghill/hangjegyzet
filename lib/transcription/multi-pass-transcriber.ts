import OpenAI from 'openai'
import { VocabularyManager, VocabularyTerm } from '@/lib/vocabulary/hungarian-business'
import { audioPreprocessor, PreprocessingResult } from './audio-preprocessor'
import Anthropic from '@anthropic-ai/sdk'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface MultiPassOptions {
  organizationId: string
  language?: string
  passes?: number
  temperatures?: number[]
  useEnhancedPostProcessing?: boolean
  customVocabulary?: string[]
  contextHints?: string[]
  speakerCount?: number
}

export interface PassResult {
  text: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
    confidence?: number
  }>
  confidence: number
  temperature: number
}

export interface MultiPassResult {
  finalText: string
  finalSegments: Array<{
    id: number
    start: number
    end: number
    text: string
    speaker?: string
    confidence?: number
  }>
  passes: PassResult[]
  preprocessingResult: PreprocessingResult
  postProcessingApplied: boolean
  vocabularyMatches: number
  duration: number
}

export class MultiPassTranscriber {
  private vocabularyManager: VocabularyManager

  constructor() {
    this.vocabularyManager = new VocabularyManager()
  }

  /**
   * Perform multi-pass transcription with different parameters
   */
  async transcribe(
    audioBuffer: Buffer,
    options: MultiPassOptions
  ): Promise<MultiPassResult> {
    const {
      organizationId,
      language = 'hu',
      passes = 2,
      temperatures = [0.0, 0.2],
      useEnhancedPostProcessing = true,
      customVocabulary = [],
      contextHints = [],
      speakerCount
    } = options

    // Step 1: Preprocess audio
    console.log('Preprocessing audio...')
    const preprocessingResult = await audioPreprocessor.preprocess(audioBuffer)

    // If audio quality is poor, enhance it
    let processedBuffer = preprocessingResult.processedAudioBuffer
    if (preprocessingResult.needsEnhancement) {
      console.log('Audio quality is poor, applying enhancement...')
      processedBuffer = await audioPreprocessor.enhanceAudio(processedBuffer)
    }

    // Step 2: Load organization vocabulary
    const vocabulary = await this.loadVocabulary(organizationId)
    const vocabularyPrompt = this.buildVocabularyPrompt(vocabulary, customVocabulary, contextHints)

    // Step 3: Perform multiple transcription passes
    const passResults: PassResult[] = []
    
    for (let i = 0; i < passes; i++) {
      const temperature = temperatures[i] || 0.1
      console.log(`Performing transcription pass ${i + 1} with temperature ${temperature}...`)
      
      const passResult = await this.performTranscriptionPass(
        processedBuffer,
        {
          language,
          temperature,
          prompt: vocabularyPrompt,
          passNumber: i + 1
        }
      )
      
      passResults.push(passResult)
    }

    // Step 4: Merge and reconcile results
    console.log('Merging transcription results...')
    const mergedResult = await this.mergeTranscriptionResults(passResults)

    // Step 5: Apply enhanced post-processing with Claude Opus
    let finalText = mergedResult.text
    let finalSegments = mergedResult.segments

    if (useEnhancedPostProcessing) {
      console.log('Applying enhanced post-processing with Claude Opus...')
      const enhanced = await this.enhanceWithClaude(
        finalText,
        finalSegments,
        vocabulary,
        language,
        contextHints
      )
      finalText = enhanced.text
      finalSegments = enhanced.segments
    }

    // Step 6: Count vocabulary matches
    const vocabularyMatches = this.countVocabularyMatches(finalText, vocabulary)

    // Step 7: Apply speaker diarization if requested
    if (speakerCount && speakerCount > 1) {
      console.log(`Applying speaker diarization for ${speakerCount} speakers...`)
      finalSegments = await this.applySpeakerDiarization(
        finalSegments,
        preprocessingResult.voiceSegments,
        speakerCount
      )
    }

    return {
      finalText,
      finalSegments,
      passes: passResults,
      preprocessingResult,
      postProcessingApplied: useEnhancedPostProcessing,
      vocabularyMatches,
      duration: preprocessingResult.processedDuration
    }
  }

  /**
   * Perform a single transcription pass
   */
  private async performTranscriptionPass(
    audioBuffer: Buffer,
    options: {
      language: string
      temperature: number
      prompt: string
      passNumber: number
    }
  ): Promise<PassResult> {
    // Prepare audio for Whisper
    const whisperAudio = await audioPreprocessor.prepareForWhisper(audioBuffer)

    // Create file object
    const audioFile = new File(
      [whisperAudio],
      `audio_pass_${options.passNumber}.mp3`,
      { type: 'audio/mpeg' }
    )

    try {
      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language,
        response_format: 'verbose_json',
        prompt: options.prompt,
        temperature: options.temperature,
      })

      // Calculate confidence based on various factors
      const confidence = this.calculatePassConfidence(transcription)

      return {
        text: transcription.text,
        segments: transcription.segments?.map((seg, idx) => ({
          id: idx,
          start: seg.start,
          end: seg.end,
          text: seg.text.trim(),
          confidence: seg.no_speech_prob ? 1 - seg.no_speech_prob : undefined
        })) || [],
        confidence,
        temperature: options.temperature
      }
    } catch (error) {
      console.error(`Transcription pass ${options.passNumber} failed:`, error)
      throw error
    }
  }

  /**
   * Load and prepare vocabulary for the organization
   */
  private async loadVocabulary(organizationId: string): Promise<VocabularyTerm[]> {
    try {
      const terms = await this.vocabularyManager.getTerms(organizationId)
      // Sort by usage count and confidence for prioritization
      return terms.sort((a, b) => {
        const scoreA = a.usage_count * a.confidence_score
        const scoreB = b.usage_count * b.confidence_score
        return scoreB - scoreA
      })
    } catch (error) {
      console.error('Error loading vocabulary:', error)
      return []
    }
  }

  /**
   * Build vocabulary prompt for Whisper
   */
  private buildVocabularyPrompt(
    vocabulary: VocabularyTerm[],
    customVocabulary: string[],
    contextHints: string[]
  ): string {
    const parts: string[] = []

    // Add context if provided
    if (contextHints.length > 0) {
      parts.push(`Context: ${contextHints.join(', ')}.`)
    }

    // Add high-confidence vocabulary terms (limit to prevent prompt overflow)
    const topTerms = vocabulary
      .filter(term => term.confidence_score > 0.7)
      .slice(0, 50)
      .map(term => term.term)

    if (topTerms.length > 0) {
      parts.push(`Key terms: ${topTerms.join(', ')}.`)
    }

    // Add custom vocabulary
    if (customVocabulary.length > 0) {
      parts.push(`Additional terms: ${customVocabulary.join(', ')}.`)
    }

    // Add general Hungarian business context
    parts.push('Hungarian business meeting transcription with technical terminology.')

    return parts.join(' ')
  }

  /**
   * Merge results from multiple transcription passes
   */
  private async mergeTranscriptionResults(
    passResults: PassResult[]
  ): Promise<{ text: string; segments: any[] }> {
    if (passResults.length === 1) {
      return {
        text: passResults[0].text,
        segments: passResults[0].segments
      }
    }

    // Use the result with highest confidence as base
    const sortedByConfidence = [...passResults].sort((a, b) => b.confidence - a.confidence)
    const baseResult = sortedByConfidence[0]

    // Merge segments using alignment algorithm
    const mergedSegments = this.mergeSegments(
      passResults.map(r => r.segments)
    )

    // Reconstruct text from merged segments
    const mergedText = mergedSegments
      .map(seg => seg.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      text: mergedText,
      segments: mergedSegments
    }
  }

  /**
   * Merge segments from multiple passes
   */
  private mergeSegments(segmentArrays: any[][]): any[] {
    if (segmentArrays.length === 0) return []
    if (segmentArrays.length === 1) return segmentArrays[0]

    const mergedSegments: any[] = []
    const baseSegments = segmentArrays[0]

    for (let i = 0; i < baseSegments.length; i++) {
      const baseSegment = baseSegments[i]
      const alignedSegments = segmentArrays.map(segments => 
        this.findAlignedSegment(baseSegment, segments)
      ).filter(Boolean)

      // Choose the best text based on various factors
      const bestText = this.selectBestText(alignedSegments)

      mergedSegments.push({
        id: i,
        start: baseSegment.start,
        end: baseSegment.end,
        text: bestText,
        confidence: this.calculateMergedConfidence(alignedSegments)
      })
    }

    return mergedSegments
  }

  /**
   * Find aligned segment in another pass
   */
  private findAlignedSegment(targetSegment: any, segments: any[]): any | null {
    const tolerance = 0.5 // 500ms tolerance

    return segments.find(seg => 
      Math.abs(seg.start - targetSegment.start) < tolerance &&
      Math.abs(seg.end - targetSegment.end) < tolerance
    ) || null
  }

  /**
   * Select best text from aligned segments
   */
  private selectBestText(segments: any[]): string {
    if (segments.length === 0) return ''
    if (segments.length === 1) return segments[0].text

    // Count occurrences of each text variant
    const textCounts = new Map<string, number>()
    
    segments.forEach(seg => {
      const normalizedText = seg.text.trim().toLowerCase()
      textCounts.set(normalizedText, (textCounts.get(normalizedText) || 0) + 1)
    })

    // Find most common variant
    let maxCount = 0
    let mostCommon = ''
    
    textCounts.forEach((count, text) => {
      if (count > maxCount) {
        maxCount = count
        mostCommon = text
      }
    })

    // Return the original casing of the most common variant
    const originalSegment = segments.find(seg => 
      seg.text.trim().toLowerCase() === mostCommon
    )

    return originalSegment?.text || segments[0].text
  }

  /**
   * Enhance transcription with Claude Opus
   */
  private async enhanceWithClaude(
    text: string,
    segments: any[],
    vocabulary: VocabularyTerm[],
    language: string,
    contextHints: string[]
  ): Promise<{ text: string; segments: any[] }> {
    try {
      // Prepare vocabulary context for Claude
      const vocabularyContext = vocabulary
        .slice(0, 100)
        .map(term => `${term.term}${term.variations ? ` (variations: ${term.variations.join(', ')})` : ''}`)
        .join('\n')

      const systemPrompt = `You are an expert transcription post-processor specializing in ${language === 'hu' ? 'Hungarian' : language} business language. Your task is to:
1. Correct any transcription errors while preserving the original meaning
2. Fix grammar and punctuation
3. Ensure proper capitalization of names, companies, and technical terms
4. Maintain coherence and natural flow
5. Use the provided vocabulary when appropriate

Important vocabulary terms:
${vocabularyContext}

Context: ${contextHints.join(', ') || 'General business meeting'}

Return the corrected text and a list of corrections made.`

      const response = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please process this transcription and return the result in JSON format with fields "corrected_text" and "corrections" (array of {original, corrected, reason}):\n\n${text}`
          }
        ]
      })

      // Parse Claude's response
      const content = response.content[0]
      if (content.type === 'text') {
        try {
          const result = JSON.parse(content.text)
          
          // Apply corrections to segments
          const correctedSegments = this.applyCorrectionsToSegments(
            segments,
            result.corrections || []
          )

          // Log corrections for learning
          if (result.corrections && result.corrections.length > 0) {
            console.log(`Claude made ${result.corrections.length} corrections`)
          }

          return {
            text: result.corrected_text || text,
            segments: correctedSegments
          }
        } catch (parseError) {
          console.error('Error parsing Claude response:', parseError)
          // Return original if parsing fails
          return { text, segments }
        }
      }

      return { text, segments }
    } catch (error) {
      console.error('Error enhancing with Claude:', error)
      // Return original on error
      return { text, segments }
    }
  }

  /**
   * Apply corrections to segments
   */
  private applyCorrectionsToSegments(
    segments: any[],
    corrections: Array<{ original: string; corrected: string; reason: string }>
  ): any[] {
    const correctedSegments = [...segments]

    corrections.forEach(correction => {
      correctedSegments.forEach(segment => {
        if (segment.text.includes(correction.original)) {
          segment.text = segment.text.replace(
            correction.original,
            correction.corrected
          )
        }
      })
    })

    return correctedSegments
  }

  /**
   * Calculate confidence score for a transcription pass
   */
  private calculatePassConfidence(transcription: any): number {
    let confidence = 0.5 // Base confidence

    // Factor 1: Length of transcription
    if (transcription.text && transcription.text.length > 100) {
      confidence += 0.1
    }

    // Factor 2: Number of segments
    if (transcription.segments && transcription.segments.length > 5) {
      confidence += 0.1
    }

    // Factor 3: Average no_speech_prob (if available)
    if (transcription.segments && transcription.segments.length > 0) {
      const avgNoSpeechProb = transcription.segments
        .filter((s: any) => s.no_speech_prob !== undefined)
        .reduce((sum: number, s: any) => sum + s.no_speech_prob, 0) / transcription.segments.length
      
      if (avgNoSpeechProb < 0.5) {
        confidence += 0.2
      }
    }

    // Factor 4: Consistency of segment timing
    if (transcription.segments && transcription.segments.length > 1) {
      const gaps = []
      for (let i = 1; i < transcription.segments.length; i++) {
        gaps.push(transcription.segments[i].start - transcription.segments[i-1].end)
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length
      if (avgGap < 1.0) { // Less than 1 second average gap
        confidence += 0.1
      }
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Calculate merged confidence from multiple segments
   */
  private calculateMergedConfidence(segments: any[]): number {
    if (segments.length === 0) return 0
    
    const confidences = segments
      .filter(s => s.confidence !== undefined)
      .map(s => s.confidence)
    
    if (confidences.length === 0) return 0.5
    
    // Use weighted average with slight preference for agreement
    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length
    const agreementBonus = segments.length > 1 ? 0.1 : 0
    
    return Math.min(avg + agreementBonus, 1.0)
  }

  /**
   * Count vocabulary matches in text
   */
  private countVocabularyMatches(text: string, vocabulary: VocabularyTerm[]): number {
    const lowerText = text.toLowerCase()
    let matches = 0

    vocabulary.forEach(term => {
      // Count main term
      const termRegex = new RegExp(`\\b${term.term}\\b`, 'gi')
      const termMatches = (lowerText.match(termRegex) || []).length
      matches += termMatches

      // Count variations
      if (term.variations) {
        term.variations.forEach(variation => {
          const varRegex = new RegExp(`\\b${variation}\\b`, 'gi')
          const varMatches = (lowerText.match(varRegex) || []).length
          matches += varMatches
        })
      }
    })

    return matches
  }

  /**
   * Apply speaker diarization to segments
   */
  private async applySpeakerDiarization(
    segments: any[],
    voiceSegments: any[],
    speakerCount: number
  ): Promise<any[]> {
    // Simple heuristic-based diarization
    // In production, use a proper diarization service like pyannote or AWS Transcribe

    const speakers = Array.from({ length: speakerCount }, (_, i) => `Speaker ${i + 1}`)
    let currentSpeaker = 0

    return segments.map((segment, index) => {
      // Change speaker after significant pauses
      if (index > 0) {
        const gap = segment.start - segments[index - 1].end
        if (gap > 2.0) { // 2 second gap
          currentSpeaker = (currentSpeaker + 1) % speakerCount
        }
      }

      return {
        ...segment,
        speaker: speakers[currentSpeaker]
      }
    })
  }

  /**
   * Learn from transcription results
   */
  async learnFromResults(
    organizationId: string,
    originalText: string,
    correctedText: string,
    corrections: Array<{ original: string; corrected: string }>
  ): Promise<void> {
    // Update vocabulary confidence based on corrections
    const vocabulary = await this.loadVocabulary(organizationId)

    for (const correction of corrections) {
      // Check if correction involves vocabulary terms
      for (const term of vocabulary) {
        const termWords = [term.term, ...(term.variations || [])]
        
        if (termWords.some(w => correction.original.toLowerCase().includes(w))) {
          // Term was misrecognized
          await this.vocabularyManager.updateTerm(term.id, {
            confidence_score: Math.max(term.confidence_score - 0.05, 0.1)
          })
        } else if (termWords.some(w => correction.corrected.toLowerCase().includes(w))) {
          // Term should have been recognized
          await this.vocabularyManager.updateTerm(term.id, {
            usage_count: term.usage_count + 1,
            confidence_score: Math.min(term.confidence_score + 0.02, 1.0)
          })
        }
      }
    }
  }
}

export const multiPassTranscriber = new MultiPassTranscriber()