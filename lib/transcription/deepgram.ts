import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'
import { EventEmitter } from 'events'
import { VocabularyEnhancedTranscription } from './vocabulary-enhanced'

export class DeepgramTranscriber extends EventEmitter {
  private deepgram: any
  private connection: any
  private isConnected: boolean = false
  private vocabularyEnhancer: VocabularyEnhancedTranscription
  private organizationId?: string

  constructor() {
    super()
    this.deepgram = createClient(process.env.DEEPGRAM_API_KEY || '')
    this.vocabularyEnhancer = new VocabularyEnhancedTranscription()
  }

  async connect(language: string = 'hu', organizationId?: string, customKeywords?: any) {
    this.organizationId = organizationId
    
    try {
      // Get custom vocabulary if organization is provided
      let keywords = customKeywords
      if (!keywords && organizationId) {
        const vocab = await this.vocabularyEnhancer.generateCustomVocabularyForSTT(organizationId, 'deepgram')
        keywords = vocab?.keywords
      }

      const options: any = {
        language: language,
        model: 'nova-2',
        smart_format: true,
        punctuate: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
      }

      // Add custom keywords if available
      if (keywords && keywords.length > 0) {
        options.keywords = keywords
      }

      this.connection = this.deepgram.listen.live(options)

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        this.isConnected = true
        this.emit('connected')
        console.log('Deepgram connection opened')
      })

      this.connection.on(LiveTranscriptionEvents.Transcript, async (data: any) => {
        const transcript = data.channel.alternatives[0].transcript
        
        if (transcript) {
          let enhancedText = transcript
          
          // Enhance with vocabulary if organization is provided and it's a final transcript
          if (this.organizationId && data.is_final) {
            try {
              enhancedText = await this.vocabularyEnhancer.enhanceTranscription(
                transcript,
                this.organizationId,
                language
              )
            } catch (error) {
              console.error('Error enhancing transcription:', error)
            }
          }
          
          this.emit('transcription', {
            text: enhancedText,
            originalText: transcript,
            isFinal: data.is_final,
            confidence: data.channel.alternatives[0].confidence,
          })
        }
      })

      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        this.emit('utterance-end')
      })

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        this.isConnected = false
        this.emit('disconnected')
        console.log('Deepgram connection closed')
      })

      this.connection.on(LiveTranscriptionEvents.Error, (error: Error) => {
        console.error('Deepgram error:', error)
        this.emit('error', error)
      })

    } catch (error) {
      console.error('Failed to connect to Deepgram:', error)
      throw error
    }
  }

  sendAudio(audioData: ArrayBuffer) {
    if (this.isConnected && this.connection) {
      this.connection.send(audioData)
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.finish()
      this.connection = null
      this.isConnected = false
    }
  }
}

// Singleton instance
export const deepgramTranscriber = new DeepgramTranscriber()