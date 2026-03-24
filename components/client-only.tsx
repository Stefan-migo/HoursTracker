'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

// Atributos inyectados por extensiones del navegador que causan hidratación
const EXTENSION_ATTRIBUTES = ['bis_skin_checked', 'bis_custom_element']

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Limpiar atributos de extensiones del contenedor antes de montar
    const cleanupExtensionAttributes = () => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT
      )
      
      let node: Node | null
      while ((node = walker.nextNode()) !== null) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element
          EXTENSION_ATTRIBUTES.forEach(attr => {
            if (element.hasAttribute(attr)) {
              element.removeAttribute(attr)
            }
          })
        }
      }
    }

    cleanupExtensionAttributes()
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
