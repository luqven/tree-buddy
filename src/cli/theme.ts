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
 * Dracula theme - purple and cyan focused
 */
export const draculaTheme: Theme = {
  name: 'dracula',
  colors: {
    primary: 'magenta',
    secondary: 'cyan',
    muted: 'brightBlack',
    
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    
    selection: 'magenta',
    badge: 'brightBlack',
    badgeMerged: 'magenta',
    badgeLocked: 'red',
    badgeMain: 'cyan',
    
    actionKey: 'magenta',
    actionLabel: 'white',
    actionDisabled: 'brightBlack',
    actionHighlight: 'cyan',
  },
};

/**
 * Nord theme - blue focused, calm colors
 */
export const nordTheme: Theme = {
  name: 'nord',
  colors: {
    primary: 'blue',
    secondary: 'cyan',
    muted: 'brightBlack',
    
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'blue',
    
    selection: 'blue',
    badge: 'brightBlack',
    badgeMerged: 'cyan',
    badgeLocked: 'red',
    badgeMain: 'blue',
    
    actionKey: 'blue',
    actionLabel: 'white',
    actionDisabled: 'brightBlack',
    actionHighlight: 'cyan',
  },
};

/**
 * Monokai theme - warm colors, orange/yellow focused
 */
export const monokaiTheme: Theme = {
  name: 'monokai',
  colors: {
    primary: 'yellow',
    secondary: 'magenta',
    muted: 'brightBlack',
    
    success: 'green',
    warning: 'yellow',
    error: 'red',
    info: 'cyan',
    
    selection: 'yellow',
    badge: 'brightBlack',
    badgeMerged: 'magenta',
    badgeLocked: 'red',
    badgeMain: 'green',
    
    actionKey: 'yellow',
    actionLabel: 'white',
    actionDisabled: 'brightBlack',
    actionHighlight: 'magenta',
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
  dracula: draculaTheme,
  nord: nordTheme,
  monokai: monokaiTheme,
  default: defaultTheme,
};

/**
 * Current active theme
 */
let currentTheme: Theme = defaultTheme;

/**
 * Preview state for theme switching
 */
let previewThemeName: string | null = null;
let savedTheme: Theme = currentTheme;

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
 * Get list of available theme names (excludes 'default' alias)
 */
export function getThemeNames(): string[] {
  return Object.keys(themes).filter(n => n !== 'default');
}

/**
 * Preview a theme without committing
 * Call commitPreview() to keep or cancelPreview() to revert
 */
export function previewTheme(name: string): void {
  if (!previewThemeName) {
    savedTheme = currentTheme; // Save current before first preview
  }
  const theme = themes[name];
  if (theme) {
    previewThemeName = name;
    currentTheme = theme;
  }
}

/**
 * Commit the previewed theme
 * Returns the theme name that was committed, or null if no preview active
 */
export function commitPreview(): string | null {
  const committed = previewThemeName;
  previewThemeName = null;
  return committed;
}

/**
 * Cancel the preview and revert to the saved theme
 */
export function cancelPreview(): void {
  if (previewThemeName) {
    currentTheme = savedTheme;
    previewThemeName = null;
  }
}

/**
 * Check if currently previewing a theme
 */
export function isPreviewing(): boolean {
  return previewThemeName !== null;
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
