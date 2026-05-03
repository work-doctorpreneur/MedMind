import { useState, useEffect } from "react"

export interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = ({ title, description, variant = "default" }: ToastProps) => {
    console.log(`Toast: ${title} - ${description} (${variant})`)
    // For now, just use alert if it's destructive to ensure user sees it
    if (variant === "destructive") {
        alert(`${title}\n${description}`)
    }
  }

  return { toast }
}
