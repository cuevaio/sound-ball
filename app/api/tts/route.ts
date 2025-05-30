import { NextResponse } from 'next/server'
import { ElevenLabsClient } from 'elevenlabs'

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

if (!ELEVENLABS_API_KEY) {
  throw new Error('Missing required environment variables: ELEVENLABS_API_KEY')
}

const elevenlabs = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    console.log('Generating speech for text:', text)

    // Start the streaming process
    const response = await elevenlabs.textToSpeech.convertAsStream("JBFqnCBsd6RMkjVDRZzb", {
      output_format: 'mp3_44100_128',
      model_id: 'eleven_multilingual_v2',
      text,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    })

    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    // Branch stream to Supabase Storage
    const [browserStream, storageStream] = stream.tee();

    // Return the streaming response immediately
    return new Response(browserStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
      },
    })

  } catch (error) {
    console.error('Error in TTS route:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate speech',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 