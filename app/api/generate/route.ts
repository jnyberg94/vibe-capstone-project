import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import OpenAI from "openai";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type')
        let prompt: string

        // Check if request contains audio file or text prompt
        if (contentType?.includes('multipart/form-data')) {
            // Handle audio file upload
            const formData = await request.formData()
            const audioFile = formData.get('audio') as File
            
            if (!audioFile) {
                return NextResponse.json(
                    { error: 'Audio file is required' },
                    { status: 400 }
                )
            }

            // Convert File to Buffer for OpenAI API
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer())
            
            // Transcribe audio using OpenAI
            const transcription = await openai.audio.transcriptions.create({
                file: new File([audioBuffer], audioFile.name, { type: audioFile.type }),
                model: "whisper-1",
            })

            prompt = transcription.text
            
            // Return transcription result for display in prompt box
            return NextResponse.json({
                success: true,
                transcription: transcription.text,
                action: 'transcription_complete'
            })
        } else {
            // Handle text prompt
            const body = await request.json()
            prompt = body.prompt

            if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
                return NextResponse.json(
                    { error: 'Prompt is required' },
                    { status: 400 }
                )
            }
        }

        // Check authentication
        const supabase = await createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Check user credits
        const { data: userData, error: creditsError } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single()

        if (creditsError) {
            console.error('Error fetching credits:', creditsError)
            return NextResponse.json(
                { error: 'Failed to check credits' },
                { status: 500 }
            )
        }

        const userCredits = userData?.credits || 0
        if (userCredits <= 0) {
            return NextResponse.json(
                { error: 'Insufficient credits' },
                { status: 402 }
            )
        }

        // Decrement user credits first
        const { error: decrementError } = await supabase.rpc('decrement_credits')

        if (decrementError) {
            console.error('Error decrementing credits:', decrementError)
            return NextResponse.json(
                { error: 'Failed to process request' },
                { status: 500 }
            )
        }

        // Create streaming response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    // Call Claude API with streaming
                    const stream = await anthropic.messages.create({
                        model: "claude-sonnet-4-20250514",
                        max_tokens: 2500,
                        temperature: 0.1,
                        stream: true,
                        system: "You are an AI assistant specialized in improving user prompts for other AI systems. \nYour goal is to take the user's original prompt and rewrite it to make it clearer, more detailed, and more likely to get high-quality results. \n- Do not change the meaning or intention of the original prompt. \n- Provide a concise improved version, and optionally, a brief explanation of what you changed and why.\n- Do not comment on what you improved, just write the improved prompt with no other comment\n- Add hex codes if the user does not specific\n- Try to not exceed 800 token",
                        messages: [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": prompt
                                    }
                                ]
                            }
                        ]
                    })

                    // Process the stream
                    for await (const chunk of stream) {
                        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                            // Send each text chunk to the client
                            const data = JSON.stringify({
                                type: 'chunk',
                                content: chunk.delta.text
                            })
                            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`))
                        }
                    }

                    // Send completion signal
                    const completionData = JSON.stringify({
                        type: 'complete',
                        creditsRemaining: userCredits - 1
                    })
                    controller.enqueue(new TextEncoder().encode(`data: ${completionData}\n\n`))
                    controller.close()

                } catch (error) {
                    console.error('Error in streaming:', error)
                    const errorData = JSON.stringify({
                        type: 'error',
                        error: 'Failed to generate response'
                    })
                    controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`))
                    controller.close()
                }
            }
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        })

    } catch (error) {
        console.error('Error in generate API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
