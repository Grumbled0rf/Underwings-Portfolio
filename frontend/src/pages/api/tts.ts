import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const prerender = false;

const VOICE = 'en-US-AndrewMultilingualNeural';

function sanitizeForSSML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoChunks(text: string, maxLen = 500): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

async function synthesizeChunk(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      reject(new Error('TTS chunk timeout'));
    }, 30000);

    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.from(chunk));
    });
    audioStream.on('end', () => {
      clearTimeout(timeout);
      resolve(Buffer.concat(chunks));
    });
    audioStream.on('error', (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export const POST: APIRoute = async ({ request }) => {
  let tts: MsEdgeTTS | null = null;
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleaned = sanitizeForSSML(text.slice(0, 10000));
    const textChunks = splitIntoChunks(cleaned);

    tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const audioChunks: Buffer[] = [];
    for (const chunk of textChunks) {
      const audio = await synthesizeChunk(tts, chunk);
      audioChunks.push(audio);
    }

    tts.close();
    tts = null;

    const audioBuffer = Buffer.concat(audioChunks);

    if (audioBuffer.length === 0) {
      return new Response(JSON.stringify({ error: 'No audio generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error('[TTS API] Error:', err);
    if (tts) try { tts.close(); } catch {}
    return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
