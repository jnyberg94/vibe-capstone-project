"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sendMagicLink } from "@/lib/helpers"

export default function AuthPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setMessage("Please enter your email address")
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const result = await sendMagicLink(email)
      
      if (result.success) {
        setMessage(result.message)
        setIsSuccess(true)
        setEmail("") // Clear the email field on success
      } else {
        setMessage(result.error || result.message)
        setIsSuccess(false)
      }
    } catch (error) {
      setMessage("An unexpected error occurred. Please try again.")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Centered heading */}
        <h1 className="text-3xl font-bold text-black text-center">Sign-In/Sign-Up</h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm text-black">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Kole@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border-gray-300 focus:border-gray-400 focus:ring-0"
            />
          </div>

          {/* Message display */}
          {message && (
            <div className={`text-sm p-3 rounded-lg ${
              isSuccess 
                ? "bg-green-50 text-green-700 border border-green-200" 
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {message}
            </div>
          )}

          {/* Let's go button */}
          <Button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white hover:bg-gray-800 rounded-lg py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Sending..." : "Let's go!"}
          </Button>
        </form>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-600">
          <p>Enter your email to receive a magic link</p>
          <p>No password required - just click the link in your email</p>
        </div>
      </div>
    </div>
  )
}
