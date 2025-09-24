'use client'

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])

  // Fetch user credits on component mount
  useEffect(() => {
    async function fetchCredits() {
      try {
        const supabase = createClient()
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          redirect('/login')
        }

        // Fetch user credits from the users table
        const { data: userData, error: creditsError } = await supabase
          .from('users')
          .select('credits')
          .eq('id', user.id)
          .single()

        if (creditsError) {
          console.error('Error fetching credits:', creditsError)
          setCredits(0)
        } else {
          setCredits(userData?.credits || 0)
        }
      } catch (error) {
        console.error('Error in fetchCredits:', error)
        setCredits(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCredits()
  }, [])

  // Handle generate button click
  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return

    setGenerating(true)
    setResult('')
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        if (response.status === 402) {
          alert('Insufficient credits. Please upgrade your plan.')
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to generate prompt. Please try again.')
        }
        setGenerating(false)
        return
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let streamedResult = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'chunk') {
                  streamedResult += data.content
                  setResult(streamedResult)
                } else if (data.type === 'complete') {
                  setCredits(data.creditsRemaining)
                  setGenerating(false)
                } else if (data.type === 'error') {
                  alert(data.error || 'An error occurred during generation.')
                  setGenerating(false)
                }
              } catch (e) {
                // Ignore parsing errors for malformed chunks
                console.warn('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error in handleGenerate:', error)
      alert('An unexpected error occurred. Please try again.')
      setGenerating(false)
    }
  }

  // Handle recording start/stop
  const handleRecording = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        const chunks: Blob[] = []

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data)
          }
        }

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' })
          await sendAudioToAPI(audioBlob)
          stream.getTracks().forEach(track => track.stop())
        }

        recorder.start()
        setMediaRecorder(recorder)
        setAudioChunks(chunks)
        setIsRecording(true)
      } catch (error) {
        console.error('Error accessing microphone:', error)
        alert('Could not access microphone. Please check permissions.')
      }
    } else {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
        setIsRecording(false)
        setMediaRecorder(null)
        setAudioChunks([])
      }
    }
  }

  // Send audio to API for transcription and generation
  const sendAudioToAPI = async (audioBlob: Blob) => {
    setGenerating(true)
    setResult('')
    
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.wav')

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 402) {
          alert('Insufficient credits. Please upgrade your plan.')
        } else {
          const errorData = await response.json()
          alert(errorData.error || 'Failed to process audio. Please try again.')
        }
        setGenerating(false)
        return
      }

      // Check if this is a transcription response (non-streaming)
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        
        // If transcription is complete, display it in the prompt box
        if (data.action === 'transcription_complete') {
          setPrompt(data.transcription)
          setGenerating(false)
          return
        }
      }

      // Handle streaming response for generation
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let streamedResult = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                if (data.type === 'chunk') {
                  streamedResult += data.content
                  setResult(streamedResult)
                } else if (data.type === 'complete') {
                  setCredits(data.creditsRemaining)
                  setGenerating(false)
                } else if (data.type === 'error') {
                  alert(data.error || 'An error occurred during generation.')
                  setGenerating(false)
                }
              } catch (e) {
                // Ignore parsing errors for malformed chunks
                console.warn('Failed to parse SSE data:', e)
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error in sendAudioToAPI:', error)
      alert('An unexpected error occurred. Please try again.')
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-black">Promptr</h1>

        <div className="flex items-center gap-3">
          <div className="bg-white text-black px-3 py-1 rounded-full text-sm border border-gray-200">
            {credits !== null ? `${credits} Credits Remaining` : 'Loading credits...'}
          </div>
          <Button className="bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg">Upgrade</Button>
        </div>
      </div>

      {/* Main content - two panels */}
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-140px)]">
        {/* Left panel */}
        <div className="bg-gray-100 rounded-lg p-6 flex flex-col">
          <Textarea
            placeholder="Describe your UI component here"
            className="flex-1 bg-gray-100 border-none resize-none focus:ring-0 focus:border-none text-gray-700 placeholder:text-gray-500"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button 
              className={`px-6 py-2 rounded-lg ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
              onClick={handleRecording}
              disabled={generating || credits === 0}
            >
              {isRecording ? 'Stop Recording' : 'Record Audio'}
            </Button>
            <Button 
              className="bg-black text-white hover:bg-gray-800 px-6 py-2 rounded-lg"
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || credits === 0}
            >
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {/* Right panel */}
        <div className="bg-gray-100 rounded-lg p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Generated Prompt</h2>
          {result ? (
            <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{result}</p>
            </div>
          ) : (
            <div className="flex-1 bg-white rounded-lg p-4 border border-gray-200 flex items-center justify-center">
              <p className="text-gray-500 text-center">
                {generating ? 'Generating your improved prompt...' : 'Your improved prompt will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
