// Motor de templates para mensajes contextuales

import type { MessageContext, MessageTemplate } from './types'

/**
 * Interpola variables en un template
 * Soporta: {{variable}} y {{#variable}} texto {{/variable}} (condicional)
 */
function interpolate(template: string, context: MessageContext): string {
  // Primero procesar condicionales {{#variable}}...{{/variable}}
  let result = template.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
    const value = context[key as keyof MessageContext]
    return value ? content : ''
  })

  // Luego reemplazar variables simples {{variable}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key as keyof MessageContext]
    return value !== null && value !== undefined ? String(value) : match
  })

  return result
}

/**
 * Parsea un tiempo en formato "HH:MM:SS" o "HH:MM" a minutos
 */
function parseElapsedToMinutes(elapsedTime: string): number {
  const parts = elapsedTime.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 60 + parts[1] + parts[2] / 60
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

class MessageTemplateEngine {
  private templates: MessageTemplate[] = []

  register(template: MessageTemplate): void {
    this.templates.push(template)
    // Ordenar por prioridad descendente
    this.templates.sort((a, b) => b.priority - a.priority)
  }

  generate(context: MessageContext): string {
    // Encontrar templates aplicables
    const applicable = this.templates.filter((t) => t.condition(context))

    if (applicable.length === 0) {
      return this.getDefaultMessage(context)
    }

    // Seleccionar el de mayor prioridad
    const selected = applicable[0]
    // Elegir variante aleatoria
    const variant =
      selected.variants[Math.floor(Math.random() * selected.variants.length)]

    return interpolate(variant, context)
  }

  private getDefaultMessage(context: MessageContext): string {
    const defaults = {
      pending: '¿Listo para empezar?',
      working: '¡Sigue así!',
      completed: '¡Buen trabajo!',
    }
    return defaults[context.state]
  }
}

// Instancia singleton del motor
export const messageEngine = new MessageTemplateEngine()

// Exportar utilidades
export { interpolate, parseElapsedToMinutes }
