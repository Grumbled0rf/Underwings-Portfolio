import type { APIRoute } from 'astro';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const prerender = false;

const VOICE = 'en-US-JennyNeural';
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;
const CHUNK_TIMEOUT = 20_000;
const MAX_TEXT = 12_000;
const MAX_CHUNK = 800;
const PARALLEL_BATCH = 3;
const MAX_RETRIES = 1;

function sanitize(text: string): string {
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

function splitIntoChunks(text: string, maxLen = MAX_CHUNK): string[] {
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

async function synthesizeChunk(text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(VOICE, FORMAT);
    return await new Promise<Buffer>((resolve, reject) => {
      const { audioStream } = tts.toStream(text);
      const buffers: Buffer[] = [];
      const timer = setTimeout(() => reject(new Error('Chunk timeout')), CHUNK_TIMEOUT);
      audioStream.on('data', (chunk: Buffer) => buffers.push(Buffer.from(chunk)));
      audioStream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(buffers)); });
      audioStream.on('error', (err: Error) => { clearTimeout(timer); reject(err); });
    });
  } finally {
    try { tts.close(); } catch {}
  }
}

async function synthesizeWithRetry(text: string): Promise<Buffer> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await synthesizeChunk(text);
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(r => setTimeout(r, 200));
    }
  }
  throw new Error('Exhausted retries');
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const text = body.text;

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing text' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleaned = sanitize(text.slice(0, MAX_TEXT));
    const chunks = splitIntoChunks(cleaned);

    console.log(`[TTS] Synthesizing ${chunks.length} chunks (${cleaned.length} chars)`);

    // Process chunks in parallel batches, preserving order
    const orderedAudio: Buffer[] = new Array(chunks.length);

    for (let batchStart = 0; batchStart < chunks.length; batchStart += PARALLEL_BATCH) {
      const batchEnd = Math.min(batchStart + PARALLEL_BATCH, chunks.length);
      const batchPromises = [];

      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(
          synthesizeWithRetry(chunks[i]).then(buf => { orderedAudio[i] = buf; })
        );
      }

      await Promise.all(batchPromises);
    }

    const audioBuffer = Buffer.concat(orderedAudio.filter(Boolean));

    if (audioBuffer.length === 0) {
      return new Response(JSON.stringify({ error: 'No audio generated' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[TTS] Done: ${audioBuffer.length} bytes`);

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
    return new Response(JSON.stringify({ error: 'TTS generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
