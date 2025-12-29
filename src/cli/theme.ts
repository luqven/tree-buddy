/**
 * CLI Theme System
 * 
 * Uses ANSI color names that terminals map to their palette.
 * This ensures colors look good in both light and dark terminal themes.
 */

export type AnsiColor = 
  | 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white'
  | 'brightBlack' | 'brightRed' | 'brightGreen' | 'brightYellow' 
  | 'brightBlue' | 'brightMagenta' | 'brightCyan' | 'brightWhite';

export interface Theme {
  name: string;
  colors: {
    // UI elements
    primary: AnsiColor;        // Main accent color (titles, selected items)
    secondary: AnsiColor;      // Secondary accent
    muted: AnsiColor;          // De-emphasized text
    
    // Status colors
    success: AnsiColor;        // Clean/ok status
    warning: AnsiColor;        // Dirty/uncommitted
    error: AnsiColor;          // Behind/problems
    info: AnsiColor;           // Informational
    
    // Specific elements
    selection: AnsiColor;      // Selected item marker
    badge: AnsiColor;          // Badges like [merged], [locked]
    badgeMerged: AnsiColor;    // Merged badge
    badgeLocked: AnsiColor;    // Locked badge
    badgeMain: AnsiColor;      // Main branch badge
    
    // Action bar
    actionKey: AnsiColor;      // Keybinding brackets
    actionLabel: AnsiColor;    // Action label text
    actionDisabled: AnsiColor; // Disabled action
    actionHighlight: AnsiColor;// Highlighted/suggested action
  };
}

/**
 * Solarized-inspired theme using ANSI colors
 * Works well in terminals with Solarized color schemes
 */
export const solarizedTheme: Theme = {
  name: 'solarized',
  colors: {
    primary: 'cyan',
    secondary: 'blue',
    muted: 'brightBlack',
    
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    
    selection: 'cyan',
    badge: 'brightBlack',
    badgeMerged: 'blue',
    badgeLocked: 'red',
    badgeMain: 'magenta',
    
    actionKey: 'cyan',
    actionLabel: 'white',
    actionDisabled: 'brightBlack',
    actionHighlight: 'yellow',
  },
};

/**
 * Default theme - same as solarized for now
 */
export const defaultTheme = solarizedTheme;

/**
 * Available themes registry
 */
export const themes: Record<string, Theme> = {
  solarized: solarizedTheme,
  default: defaultTheme,
};

/**
 * Current active theme
 */
let currentTheme: Theme = defaultTheme;

/**
 * Get the current theme
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Set the current theme by name
 */
export function setTheme(name: string): void {
  const theme = themes[name];
  if (theme) {
    currentTheme = theme;
  }
}

/**
 * Map AnsiColor to OpenTUI fg prop value
 * OpenTUI uses lowercase color names
 */
export function toFg(color: AnsiColor | undefined): string | undefined {
  if (!color) return undefined;
  
  // Map bright colors to their base + bold, or just return the color
  // OpenTUI might handle these differently, so we normalize
  const colorMap: Record<AnsiColor, string> = {
    black: 'black',
    red: 'red',
    green: 'green',
    yellow: 'yellow',
    blue: 'blue',
    magenta: 'magenta',
    cyan: 'cyan',
    white: 'white',
    brightBlack: 'gray',
    brightRed: 'red',
    brightGreen: 'green',
    brightYellow: 'yellow',
    brightBlue: 'blue',
    brightMagenta: 'magenta',
    brightCyan: 'cyan',
    brightWhite: 'white',
  };
  
  return colorMap[color] || color;
}
