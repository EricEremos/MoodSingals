const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

export const ENABLE_SYNC = ENABLED_VALUES.has(
  String(import.meta.env.VITE_ENABLE_SYNC || '').trim().toLowerCase(),
)
