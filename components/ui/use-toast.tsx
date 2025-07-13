"use client"

// Wrapper for Sonner toast functionality
import { toast as sonnerToast } from 'sonner'

export interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

export const toast = (options: ToastOptions) => {
  const { title, description, variant = 'default', duration = 4000 } = options
  
  const message = title || description || ''
  
  if (variant === 'destructive') {
    sonnerToast.error(message, {
      description: title ? description : undefined,
      duration,
    })
  } else {
    sonnerToast.success(message, {
      description: title ? description : undefined,
      duration,
    })
  }
}

export const useToast = () => {
  return {
    toast: (options: ToastOptions) => toast(options),
  }
}