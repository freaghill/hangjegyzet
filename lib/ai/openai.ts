import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

export async function transcribeAudio(audioBuffer: Buffer, language = 'hu') {
  const response = await openai.audio.transcriptions.create({
    file: new File([audioBuffer], 'audio.wav', { type: 'audio/wav' }),
    model: 'whisper-1',
    language,
  });
  
  return response.text;
}

export async function generateSummary(text: string) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that creates concise meeting summaries.',
      },
      {
        role: 'user',
        content: `Please summarize the following meeting transcript:\n\n${text}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  
  return response.choices[0]?.message?.content || '';
}