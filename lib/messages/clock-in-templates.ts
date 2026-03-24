// Templates de mensajes para el ClockInCard
// Registra todos los mensajes contextuales según estado, hora, día, etc.

import { messageEngine, parseElapsedToMinutes } from './engine'

// ============================================================================
// ESTADO: PENDING (Sin entrada)
// ============================================================================

// Mañana temprano (5am - 9am)
messageEngine.register({
  id: 'pending-morning-early',
  condition: (ctx) =>
    ctx.state === 'pending' && ctx.timeOfDay === 'morning' && ctx.currentHour < 9,
  priority: 100,
  variants: [
    '¡Buenos días{{#userName}} {{userName}}{{/userName}}! ¿Listo para conquistar el día?',
    'Un nuevo día, nuevas oportunidades. ¿Empezamos?',
    'La mañana es el momento perfecto para comenzar. ¿Listo?',
    '¡Arriba{{#userName}} {{userName}}{{/userName}}! El día te espera.',
  ],
})

// Mañana tarde (9am - 12pm)
messageEngine.register({
  id: 'pending-morning-late',
  condition: (ctx) =>
    ctx.state === 'pending' &&
    ctx.timeOfDay === 'morning' &&
    ctx.currentHour >= 9,
  priority: 95,
  variants: [
    'Buenos días. ¿Todo bien con la llegada?',
    '¡Hola! ¿Listo para empezar la jornada?',
    'Nunca es tarde para comenzar. ¿Empezamos?',
  ],
})

// Tarde (12pm - 6pm)
messageEngine.register({
  id: 'pending-afternoon',
  condition: (ctx) => ctx.state === 'pending' && ctx.timeOfDay === 'afternoon',
  priority: 90,
  variants: [
    'Buenas tardes. ¿Empezando tarde hoy?',
    'Mejor tarde que nunca. ¿Listo para comenzar?',
    '¡Hola! ¿Todo bien? Hora de empezar.',
    'La tarde también es buen momento. ¿Empezamos?',
  ],
})

// Noche (después de 6pm)
messageEngine.register({
  id: 'pending-evening',
  condition: (ctx) => ctx.state === 'pending' && (ctx.timeOfDay === 'evening' || ctx.timeOfDay === 'night'),
  priority: 85,
  variants: [
    'Buenas noches. ¿Turno de noche?',
    '¿Empezando tarde hoy? No hay problema.',
    'Noche de trabajo. ¿Listo?',
  ],
})

// Viernes - cualquier hora
messageEngine.register({
  id: 'pending-friday',
  condition: (ctx) =>
    ctx.state === 'pending' &&
    (ctx.dayOfWeek === 'viernes' || ctx.dayOfWeek === 'friday'),
  priority: 110, // Mayor prioridad
  variants: [
    '¡Por fin viernes{{#userName}} {{userName}}{{/userName}}! 🎉',
    'Último día de la semana. ¡Vamos con todo!',
    '¡Viernes! El día más esperado. ¿Empezamos?',
    'Viernes + café = día perfecto. ¡Adelante!',
  ],
})

// Lunes - cualquier hora
messageEngine.register({
  id: 'pending-monday',
  condition: (ctx) =>
    ctx.state === 'pending' &&
    (ctx.dayOfWeek === 'lunes' || ctx.dayOfWeek === 'monday'),
  priority: 105,
  variants: [
    '¡Feliz lunes{{#userName}} {{userName}}{{/userName}}! Nueva semana, nuevos retos.',
    'Comienza la semana con energía. ¿Listo?',
    'Lunes de empezar con todo. ¡Adelante!',
  ],
})

// ============================================================================
// ESTADO: WORKING (En jornada)
// ============================================================================

// Recién empezado (< 2 horas)
messageEngine.register({
  id: 'working-early',
  condition: (ctx) => {
    if (ctx.state !== 'working') return false
    const minutes = parseElapsedToMinutes(ctx.elapsedTime)
    return minutes < 120
  },
  priority: 100,
  variants: [
    '¡En marcha{{#userName}} {{userName}}{{/userName}}! Llevas {{elapsedTime}} de trabajo concentrado.',
    '¡Vas muy bien! Ya van {{elapsedTime}}.',
    'El ritmo es bueno. Sigue así 💪',
    '¡Empezaste con fuerza! Van {{elapsedTime}}.',
  ],
})

// Mitad de jornada (2-6 horas)
messageEngine.register({
  id: 'working-mid',
  condition: (ctx) => {
    if (ctx.state !== 'working') return false
    const minutes = parseElapsedToMinutes(ctx.elapsedTime)
    return minutes >= 120 && minutes < 360
  },
  priority: 95,
  variants: [
    '¡Vas por buen camino! Llevas {{elapsedTime}}.',
    '¡Mitad de camino aproximadamente! Van {{elapsedTime}}.',
    'Vas avanzando muy bien. {{elapsedTime}} y contando.',
    '¡Sigue así{{#userName}} {{userName}}{{/userName}}! Llevas {{elapsedTime}}.',
  ],
})

// Cerca de completar (6-8 horas)
messageEngine.register({
  id: 'working-near-complete',
  condition: (ctx) => {
    if (ctx.state !== 'working') return false
    const minutes = parseElapsedToMinutes(ctx.elapsedTime)
    return minutes >= 360 && minutes < 480
  },
  priority: 98,
  variants: [
    '¡Ya casi! Llevas {{elapsedTime}}.',
    '¡Estás cerca de completar tu jornada! Van {{elapsedTime}}.',
    'Último empujón. {{elapsedTime}} de trabajo productivo.',
    '¡Bien hecho! Ya van {{elapsedTime}}.',
  ],
})

// Jornada extendida (> 8 horas)
messageEngine.register({
  id: 'working-long',
  condition: (ctx) => {
    if (ctx.state !== 'working') return false
    const minutes = parseElapsedToMinutes(ctx.elapsedTime)
    return minutes >= 480 && minutes < 600
  },
  priority: 105,
  variants: [
    '¡Vaya maratón! Ya llevas {{elapsedTime}}.',
    '¡Wow! {{elapsedTime}} de trabajo. Recuerda tomar descansos.',
    'Jornada extendida: {{elapsedTime}}. ¡No olvides cuidarte!',
  ],
})

// Jornada muy larga (> 10 horas)
messageEngine.register({
  id: 'working-very-long',
  condition: (ctx) => {
    if (ctx.state !== 'working') return false
    const minutes = parseElapsedToMinutes(ctx.elapsedTime)
    return minutes >= 600
  },
  priority: 110,
  variants: [
    '¡{{elapsedTime}}! ¿No es hora de descansar{{#userName}} {{userName}}{{/userName}}?',
    '¡Impresionante! Ya van {{elapsedTime}}. Considera un break.',
    'Maratón de trabajo: {{elapsedTime}}. Tu salud es importante.',
    '¡{{elapsedTime}}! Cuando termines, descansa bien.',
  ],
})

// ============================================================================
// ESTADO: COMPLETED (Jornada terminada)
// ============================================================================

// Jornada corta (< 6 horas)
messageEngine.register({
  id: 'completed-short',
  condition: (ctx) =>
    ctx.state === 'completed' && (ctx.totalHours || 0) < 6,
  priority: 100,
  variants: [
    'Día corto: {{totalHours}}h. ¡Disfruta tu tiempo libre!',
    '¡Listo! Solo {{totalHours}}h hoy. ¿Jornada reducida?',
    '{{totalHours}}h registradas. ¡Buen trabajo!',
  ],
})

// Jornada normal (6-9 horas)
messageEngine.register({
  id: 'completed-normal',
  condition: (ctx) =>
    ctx.state === 'completed' &&
    (ctx.totalHours || 0) >= 6 &&
    (ctx.totalHours || 0) <= 9,
  priority: 100,
  variants: [
    '¡Excelente jornada de {{totalHours}}h! Bien hecho.',
    '{{totalHours}}h productivas. ¡A descansar!',
    '¡Objetivo cumplido! {{totalHours}}h de trabajo enfocado.',
    '¡{{totalHours}}h! Gran trabajo{{#userName}} {{userName}}{{/userName}}.',
  ],
})

// Jornada larga (> 9 horas)
messageEngine.register({
  id: 'completed-long',
  condition: (ctx) => ctx.state === 'completed' && (ctx.totalHours || 0) > 9,
  priority: 105,
  variants: [
    '¡{{totalHours}}h! Día muy productivo. Descansa bien.',
    '¡Increíble! {{totalHours}}h de trabajo. Te lo mereces.',
    '¡{{totalHours}}h! Espero que puedas descansar ahora.',
  ],
})

// Viernes completado
messageEngine.register({
  id: 'completed-friday',
  condition: (ctx) =>
    ctx.state === 'completed' &&
    (ctx.dayOfWeek === 'viernes' || ctx.dayOfWeek === 'friday'),
  priority: 110,
  variants: [
    '¡Fin de semana{{#userName}} {{userName}}{{/userName}}! {{totalHours}}h y a descansar 🎉',
    '¡Viernes completado! {{totalHours}}h. ¡Te lo mereces!',
    'Semana terminada: {{totalHours}}h. ¡Buen fin de semana!',
  ],
})

// ============================================================================
// Subtítulos específicos por estado
// ============================================================================

// Subtítulo para PENDING
messageEngine.register({
  id: 'subtitle-pending',
  condition: (ctx) => ctx.state === 'pending',
  priority: 90,
  variants: [
    'Registra tu entrada cuando comiences a trabajar',
    'Marca tu entrada para iniciar la jornada',
    'Tu jornada comienza cuando lo decidas',
  ],
})

// Subtítulo para WORKING
messageEngine.register({
  id: 'subtitle-working',
  condition: (ctx) => ctx.state === 'working',
  priority: 90,
  variants: [
    'Entrada registrada a las {{clockIn}}',
    'Trabajando desde las {{clockIn}}',
    'Jornada iniciada a las {{clockIn}}',
  ],
})

// Subtítulo para COMPLETED
messageEngine.register({
  id: 'subtitle-completed',
  condition: (ctx) => ctx.state === 'completed',
  priority: 90,
  variants: [
    '¡Excelente trabajo{{#userName}} {{userName}}{{/userName}}! Descansa bien.',
    'Jornada completada. ¡Hasta mañana!',
    '¡Bien hecho! A disfrutar tu tiempo libre.',
  ],
})

// ============================================================================
// Textos de botones
// ============================================================================

// Botón entrada
messageEngine.register({
  id: 'button-clock-in',
  condition: (ctx) => ctx.state === 'pending',
  priority: 80,
  variants: ['Comenzar mi día', 'Marcar Entrada', 'Iniciar Jornada', 'Empezar'],
})

// Botón salida
messageEngine.register({
  id: 'button-clock-out',
  condition: (ctx) => ctx.state === 'working',
  priority: 80,
  variants: [
    'Terminar mi día',
    'Marcar Salida',
    'Finalizar Jornada',
    'Completar',
  ],
})

// Exportar el motor configurado
export { messageEngine }
