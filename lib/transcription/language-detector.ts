import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type DetectedLanguage = {
  code: 'hu' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'ro' | 'sk' | 'cs' | 'pl'
  name: string
  confidence: number
}

export class LanguageDetector {
  // Supported languages with their names
  private readonly supportedLanguages: Record<string, string> = {
    hu: 'Magyar',
    en: 'English',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    it: 'Italiano',
    ro: 'Română',
    sk: 'Slovenčina',
    cs: 'Čeština',
    pl: 'Polski'
  }

  // Language-specific audio characteristics (for heuristic detection)
  private readonly languagePatterns: Record<string, {
    commonWords: string[]
    phoneticPatterns: RegExp[]
  }> = {
    hu: {
      commonWords: ['és', 'a', 'az', 'hogy', 'nem', 'van', 'egy', 'de', 'igen'],
      phoneticPatterns: [/gy/gi, /ny/gi, /ty/gi, /sz/gi, /cs/gi]
    },
    en: {
      commonWords: ['the', 'and', 'a', 'an', 'that', 'is', 'not', 'but', 'yes'],
      phoneticPatterns: [/th/gi, /wh/gi, /ing$/gi]
    },
    de: {
      commonWords: ['und', 'der', 'die', 'das', 'ist', 'nicht', 'aber', 'ja'],
      phoneticPatterns: [/sch/gi, /ch/gi, /ß/gi]
    }
  }

  /**
   * Detect language from audio file using Whisper
   */
  async detectFromAudio(audioBuffer: Buffer): Promise<DetectedLanguage> {
    try {
      // Create a small sample (first 30 seconds) for faster detection
      const sampleBuffer = await this.createAudioSample(audioBuffer, 30)
      
      const audioFile = new File([sampleBuffer], 'sample.mp3', { type: 'audio/mpeg' })
      
      // Use Whisper without specifying language to let it detect
      const result = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
      })
      
      // Whisper returns detected language
      const detectedLang = result.language as string
      
      // Map to our supported languages
      if (detectedLang && this.supportedLanguages[detectedLang]) {
        return {
          code: detectedLang as DetectedLanguage['code'],
          name: this.supportedLanguages[detectedLang],
          confidence: 0.95 // Whisper is generally very confident
        }
      }
      
      // Fallback to text-based detection if needed
      if (result.text) {
        return this.detectFromText(result.text)
      }
      
      // Default to Hungarian if uncertain
      return {
        code: 'hu',
        name: 'Magyar',
        confidence: 0.5
      }
    } catch (error) {
      console.error('Audio language detection failed:', error)
      // Default to Hungarian
      return {
        code: 'hu',
        name: 'Magyar',
        confidence: 0.3
      }
    }
  }

  /**
   * Detect language from transcribed text
   */
  detectFromText(text: string): DetectedLanguage {
    const scores: Record<string, number> = {}
    const words = text.toLowerCase().split(/\s+/)
    
    // Check each supported language
    for (const [lang, patterns] of Object.entries(this.languagePatterns)) {
      let score = 0
      
      // Check common words
      for (const word of patterns.commonWords) {
        const count = words.filter(w => w === word).length
        score += count * 2
      }
      
      // Check phonetic patterns
      for (const pattern of patterns.phoneticPatterns) {
        const matches = text.match(pattern)
        score += (matches?.length || 0) * 0.5
      }
      
      scores[lang] = score / words.length
    }
    
    // Find highest scoring language
    let bestLang = 'hu'
    let bestScore = 0
    
    for (const [lang, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score
        bestLang = lang
      }
    }
    
    // Calculate confidence based on score difference
    const confidence = Math.min(0.95, bestScore * 10)
    
    return {
      code: bestLang as DetectedLanguage['code'],
      name: this.supportedLanguages[bestLang],
      confidence
    }
  }

  /**
   * Create audio sample for faster detection
   */
  private async createAudioSample(
    audioBuffer: Buffer, 
    durationSeconds: number
  ): Promise<Buffer> {
    // In production, use ffmpeg to extract first N seconds
    // For now, return a portion of the buffer
    const sampleSize = Math.min(
      audioBuffer.length,
      durationSeconds * 128000 / 8 // Approximate for 128kbps audio
    )
    
    return audioBuffer.slice(0, sampleSize)
  }

  /**
   * Get language-specific transcription prompt
   */
  getTranscriptionPrompt(language: DetectedLanguage['code']): string {
    const prompts: Record<DetectedLanguage['code'], string> = {
      hu: `Ez egy magyar nyelvű felvétel. Gyakori kifejezések: ÁFA, Kft, Zrt, Bt, KATA, KIVA, 
számla, szerződés, megrendelés, ajánlat, határidő, teljesítés, fizetési feltétel, 
közbeszerzés, pályázat, tender, MNB, NAV, NEAK, forint, HUF.`,
      
      en: `This is an English recording. Common business terms: invoice, contract, order, 
proposal, deadline, delivery, payment terms, tender, budget, revenue.`,
      
      de: `Dies ist eine deutsche Aufnahme. Häufige Geschäftsbegriffe: Rechnung, Vertrag, 
Bestellung, Angebot, Frist, Lieferung, Zahlungsbedingungen, Ausschreibung.`,
      
      fr: `Ceci est un enregistrement en français. Termes commerciaux courants: facture, 
contrat, commande, proposition, délai, livraison, conditions de paiement.`,
      
      es: `Esta es una grabación en español. Términos comerciales comunes: factura, 
contrato, pedido, propuesta, plazo, entrega, condiciones de pago.`,
      
      it: `Questa è una registrazione in italiano. Termini commerciali comuni: fattura, 
contratto, ordine, proposta, scadenza, consegna, condizioni di pagamento.`,
      
      ro: `Aceasta este o înregistrare în limba română. Termeni comerciali comuni: 
factură, contract, comandă, propunere, termen, livrare, condiții de plată.`,
      
      sk: `Toto je slovenská nahrávka. Bežné obchodné termíny: faktúra, zmluva, 
objednávka, návrh, termín, dodanie, platobné podmienky.`,
      
      cs: `Toto je česká nahrávka. Běžné obchodní termíny: faktura, smlouva, 
objednávka, návrh, termín, dodání, platební podmínky.`,
      
      pl: `To jest polskie nagranie. Popularne terminy biznesowe: faktura, umowa, 
zamówienie, propozycja, termin, dostawa, warunki płatności.`
    }
    
    return prompts[language] || prompts.hu
  }

  /**
   * Check if language is supported
   */
  isSupported(languageCode: string): boolean {
    return languageCode in this.supportedLanguages
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): Array<{code: string, name: string}> {
    return Object.entries(this.supportedLanguages).map(([code, name]) => ({
      code,
      name
    }))
  }

  /**
   * Get mixed language prompt for meetings with multiple languages
   */
  getMixedLanguagePrompt(primaryLang: DetectedLanguage['code']): string {
    return `${this.getTranscriptionPrompt(primaryLang)}
    
This recording may contain multiple languages. Please transcribe all spoken content accurately, 
maintaining the original language of each speaker. Common language switches in this region.`
  }
}

export const languageDetector = new LanguageDetector()