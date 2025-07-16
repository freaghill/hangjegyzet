// Deepgram transcription service wrapper
import { deepgram } from '@/lib/transcription/deepgram';

export { deepgram };

export async function transcribeWithDeepgram(
  audioBuffer: Buffer,
  options: {
    language?: string;
    model?: string;
    punctuate?: boolean;
    utterances?: boolean;
  } = {}
) {
  const {
    language = 'hu',
    model = 'nova-2',
    punctuate = true,
    utterances = true,
  } = options;

  const response = await deepgram.transcription.preRecorded(
    { buffer: audioBuffer, mimetype: 'audio/wav' },
    {
      language,
      model,
      punctuate,
      utterances,
      smart_format: true,
    }
  );

  return response.results;
}