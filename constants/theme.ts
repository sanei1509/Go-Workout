/**
 * GO Workout — Sistema de tokens semánticos
 *
 * 9 roles de color × 2 temas (dark / light).
 * Ningún componente debe usar un valor hex directamente;
 * siempre debe referenciar un token por nombre.
 *
 * Uso:
 *   const { T } = useTheme();
 *   style={{ backgroundColor: T.surface }}
 */

export type ThemeTokens = {
  // ── Superficies ──────────────────────────────────────────────
  /** Fondo base de la pantalla */
  surface: string;
  /** Cards, modales, contenedores elevados */
  surfaceElevated: string;
  /** Bordes, separadores, líneas sutiles */
  border: string;

  // ── Texto ────────────────────────────────────────────────────
  /** Texto principal, encabezados */
  textPrimary: string;
  /** Texto secundario, subtítulos, labels de ayuda */
  textSecondary: string;

  // ── Roles de acción semántica ─────────────────────────────────
  /**
   * Elementos tocables: botones CTA, tabs activos, links.
   * Dark: #00D1FF (cyan — usarlo con moderación, no como color dominante).
   * Light: #0b1114 (carbón — el cyan no tiene contraste sobre fondo claro).
   */
  action: string;
  /** Texto e iconos sobre fondos `action` */
  actionFg: string;
  /**
   * Estado completado: checkmarks, progreso 100%, logros.
   */
  done: string;
  /**
   * Exclusivo del lado trainer (y "nota del entrenador" en student).
   * Indica que algo requiere atención o bloquea el progreso.
   */
  attention: string;

  // ── Utilidad ──────────────────────────────────────────────────
  /** Fondo de overlays/modales semitransparentes */
  overlay: string;
};

export const darkTokens: ThemeTokens = {
  surface:         '#090f12',
  surfaceElevated: '#141d21',
  border:          'rgba(255,255,255,0.10)',

  textPrimary:   '#E8EDEF',
  textSecondary: 'rgba(232,237,239,0.45)',

  action:    '#00D1FF',
  actionFg:  '#04161c',
  done:      '#4ade80',
  attention: '#FEB127',

  overlay: 'rgba(9,15,18,0.85)',
};

export const lightTokens: ThemeTokens = {
  surface:         '#F3F1EC',
  surfaceElevated: '#FBFAF8',
  border:          'rgba(9,15,18,0.14)',

  textPrimary:   '#0b1114',
  textSecondary: 'rgba(9,15,18,0.45)',

  action:    '#0b1114',
  actionFg:  '#F3F1EC',
  done:      '#2C8C4E',
  attention: '#B8791A',

  overlay: 'rgba(11,17,20,0.7)',
};

export type ThemeMode = 'auto' | 'dark' | 'light';
