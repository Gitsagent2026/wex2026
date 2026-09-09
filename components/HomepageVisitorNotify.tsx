"use client"

import { useEffect, useRef } from "react"

export default function HomepageVisitorNotify({ children }: { children: React.ReactNode }) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (sentRef.current || typeof window === "undefined") return
    sentRef.current = true

    void fetch("/api/telegram/visitor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        referrer: document.referrer || "Direct",
        pageUrl: window.location.href,
      }),
    })
  }, [])

  return <>{children}</>
}
