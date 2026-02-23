'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        // Get username from user metadata, or extract from email if not available
        const userUsername = session.user.user_metadata?.username
        if (userUsername) {
          setUsername(userUsername)
        } else if (session.user.email) {
          // Fallback: extract username from email (username@visionplus.local)
          const emailUsername = session.user.email.split('@')[0]
          setUsername(emailUsername)
        }
      }
      setLoading(false)
    }

    checkUser()

    // Listen for auth state changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userUsername = session.user.user_metadata?.username
        if (userUsername) {
          setUsername(userUsername)
        } else if (session.user.email) {
          const emailUsername = session.user.email.split('@')[0]
          setUsername(emailUsername)
        }
      } else {
        setUsername(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        {username ? (
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Hi {username}
          </h1>
        ) : (
          <>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">Welcome to VisionPlus</p>
            <Link
              href="/login"
              className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            >
              Login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
