import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';
import { transcribeWithDeepgram } from '@/lib/ai/deepgram';
import { transcribeAudio } from '@/lib/ai/openai';
import { createClient } from '@/lib/supabase/server';

export interface TranscriptionOptions {
  language?: string;
  mode?: 'fast' | 'accurate' | 'balanced';
  provider?: 'deepgram' | 'openai' | 'whisper';
  vocabulary?: string[];
}

export interface TranscriptionResult {
  text: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  confidence?: number;
  duration?: number;
  language?: string;
}

export class TranscriptionService {
  private queue: Queue;
  
  constructor() {
    this.queue = new Queue('transcription', { connection: redis });
  }
  
  async transcribeAudio(
    audioBuffer: Buffer,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const { provider = 'deepgram', language = 'hu' } = options;
    
    try {
      if (provider === 'deepgram') {
        const result = await transcribeWithDeepgram(audioBuffer, { language });
        return this.formatDeepgramResult(result);
      } else if (provider === 'openai') {
        const text = await transcribeAudio(audioBuffer, language);
        return { text, language };
      } else {
        throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }
  
  async queueTranscription(meetingId: string, audioUrl: string, options: TranscriptionOptions = {}) {
    const job = await this.queue.add('transcribe', {
      meetingId,
      audioUrl,
      options,
    });
    
    return job.id;
  }
  
  async getTranscriptionStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }
  
  private formatDeepgramResult(result: any): TranscriptionResult {
    const channel = result.channels?.[0];
    const alternatives = channel?.alternatives?.[0];
    
    return {
      text: alternatives?.transcript || '',
      segments: alternatives?.words?.map((word: any) => ({
        text: word.word,
        start: word.start,
        end: word.end,
        speaker: word.speaker,
      })),
      confidence: alternatives?.confidence,
      duration: result.metadata?.duration,
      language: result.metadata?.language,
    };
  }
  
  async updateMeetingTranscript(meetingId: string, transcript: TranscriptionResult) {
    const supabase = await createClient();
    
    const { error } = await supabase
      .from('meetings')
      .update({
        transcript: transcript.text,
        transcript_segments: transcript.segments,
        duration_seconds: transcript.duration,
        status: 'completed',
      })
      .eq('id', meetingId);
    
    if (error) throw error;
  }
}

export const transcriptionService = new TranscriptionService();