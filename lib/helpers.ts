import { createClient } from '@/lib/supabase/client'

export interface AuthResponse {
  success: boolean
  message: string
  error?: string
}

/**
 * Send magic link for email authentication
 * This function handles both sign-in and sign-up for existing/new users
 */
export async function sendMagicLink(email: string): Promise<AuthResponse> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      return {
        success: false,
        message: 'Failed to send magic link',
        error: error.message,
      }
    }

    return {
      success: true,
      message: 'Magic link sent! Check your email for the login link.',
    }
  } catch (error) {
    return {
      success: false,
      message: 'An unexpected error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  try {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }
    
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResponse> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return {
        success: false,
        message: 'Failed to sign out',
        error: error.message,
      }
    }

    return {
      success: true,
      message: 'Successfully signed out',
    }
  } catch (error) {
    return {
      success: false,
      message: 'An unexpected error occurred during sign out',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch (error) {
    console.error('Error checking authentication:', error)
    return false
  }
}
