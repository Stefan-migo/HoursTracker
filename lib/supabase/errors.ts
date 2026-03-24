export const SUPABASE_ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: 'invalid_credentials',
  AUTH_USER_NOT_FOUND: 'user_not_found',
  RLS_VIOLATION: '42501',
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  CONNECTION_ERROR: '08000',
  CONNECTION_FAILURE: '08006',
} as const

export type ErrorCode = keyof typeof SUPABASE_ERROR_CODES | string

export interface ErrorResponse {
  message: string
  status: number
  code: string
}

interface SupabaseError {
  code?: string
  message?: string
}

export function handleSupabaseError(error: SupabaseError): ErrorResponse {
  const code = error?.code || 'UNKNOWN'
  
  switch (code) {
    case SUPABASE_ERROR_CODES.RLS_VIOLATION:
      return {
        message: 'No tienes permisos para realizar esta acción',
        status: 403,
        code
      }
    case SUPABASE_ERROR_CODES.UNIQUE_VIOLATION:
      return {
        message: 'Este registro ya existe',
        status: 409,
        code
      }
    case SUPABASE_ERROR_CODES.FOREIGN_KEY_VIOLATION:
      return {
        message: 'El registro referenciado no existe',
        status: 400,
        code
      }
    case SUPABASE_ERROR_CODES.NOT_NULL_VIOLATION:
      return {
        message: 'Faltan campos requeridos',
        status: 400,
        code
      }
    case SUPABASE_ERROR_CODES.CHECK_VIOLATION:
      return {
        message: 'Los datos no cumplen con las restricciones de validación',
        status: 400,
        code
      }
    case 'PGRST116':
      return {
        message: 'El registro no existe',
        status: 404,
        code
      }
    default:
      return {
        message: error?.message || 'Error desconocido',
        status: 500,
        code
      }
  }
}

export function isSupabaseError(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in (error as object)
}
