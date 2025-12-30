/**
 * CLI Theme System
 * 
 * Uses hex colors with light/dark mode support.
 * Each theme defines colors for both terminal backgrounds.
 */

export interface ColorPalette {
  text: string;           // Default text color
  textMuted: string;      // De-emphasized text
  primary: string;        // Main accent (titles, selected items)
  secondary: string;      // Secondary accent
  success: string;        // Clean/ok status
  warning: string;        // Dirty/uncommitted
  error: string;          // Behind/problems
  info: string;           // Informational
  selection: string;      // Selected item marker
  badgeMerged: string;    // Merged badge
  badgeLocked: string;    // Locked badge
  badgeMain: string;      // Main branch badge
  actionKey: string;      // Keybinding brackets
  actionDisabled: string; // Disabled action
  actionHighlight: string;// Highlighted/suggested action
}

export interface Theme {
  name: string;
  light: ColorPalette;
  dark: ColorPalette;
}

/**
 * Solarized theme - cyan focused, classic terminal colors
 * https://ethanschoonover.com/solarized/
 */
export const solarizedTheme: Theme = {
  name: 'solarized',
  dark: {
    text: '#839496',        // base0
    textMuted: '#586e75',   // base01
    primary: '#2aa198',     // cyan
    secondary: '#268bd2',   // blue
    success: '#859900',     // green
    warning: '#b58900',     // yellow
    error: '#dc322f',       // red
    info: '#2aa198',        // cyan
    selection: '#2aa198',
    badgeMerged: '#268bd2',
    badgeLocked: '#dc322f',
    badgeMain: '#d33682',   // magenta
    actionKey: '#2aa198',
    actionDisabled: '#586e75',
    actionHighlight: '#b58900',
  },
  light: {
    text: '#657b83',        // base00
    textMuted: '#93a1a1',   // base1
    primary: '#2aa198',     // cyan
    secondary: '#268bd2',   // blue
    success: '#859900',
    warning: '#b58900',
    error: '#dc322f',
    info: '#2aa198',
    selection: '#2aa198',
    badgeMerged: '#268bd2',
    badgeLocked: '#dc322f',
    badgeMain: '#d33682',
    actionKey: '#2aa198',
    actionDisabled: '#93a1a1',
    actionHighlight: '#b58900',
  },
};

/**
 * Dracula theme - purple and cyan focused
 * https://draculatheme.com/
 */
export const draculaTheme: Theme = {
  name: 'dracula',
  dark: {
    text: '#f8f8f2',        // foreground
    textMuted: '#6272a4',   // comment
    primary: '#bd93f9',     // purple
    secondary: '#8be9fd',   // cyan
    success: '#50fa7b',     // green
    warning: '#f1fa8c',     // yellow
    error: '#ff5555',       // red
    info: '#8be9fd',        // cyan
    selection: '#bd93f9',
    badgeMerged: '#bd93f9',
    badgeLocked: '#ff5555',
    badgeMain: '#8be9fd',
    actionKey: '#bd93f9',
    actionDisabled: '#6272a4',
    actionHighlight: '#8be9fd',
  },
  light: {
    text: '#282a36',        // background as text for light
    textMuted: '#6272a4',   // comment
    primary: '#9580ff',     // purple (adjusted for light)
    secondary: '#0dcbc0',   // cyan (adjusted)
    success: '#1dab36',     // green (adjusted)
    warning: '#c7a000',     // yellow (adjusted)
    error: '#e02020',       // red (adjusted)
    info: '#0dcbc0',
    selection: '#9580ff',
    badgeMerged: '#9580ff',
    badgeLocked: '#e02020',
    badgeMain: '#0dcbc0',
    actionKey: '#9580ff',
    actionDisabled: '#6272a4',
    actionHighlight: '#0dcbc0',
  },
};

/**
 * Nord theme - blue focused, calm colors
 * https://www.nordtheme.com/
 */
export const nordTheme: Theme = {
  name: 'nord',
  dark: {
    text: '#d8dee9',        // nord4
    textMuted: '#4c566a',   // nord3
    primary: '#81a1c1',     // nord9 (blue)
    secondary: '#88c0d0',   // nord8 (cyan)
    success: '#a3be8c',     // nord14 (green)
    warning: '#ebcb8b',     // nord13 (yellow)
    error: '#bf616a',       // nord11 (red)
    info: '#81a1c1',        // nord9
    selection: '#81a1c1',
    badgeMerged: '#88c0d0',
    badgeLocked: '#bf616a',
    badgeMain: '#81a1c1',
    actionKey: '#81a1c1',
    actionDisabled: '#4c566a',
    actionHighlight: '#88c0d0',
  },
  light: {
    text: '#2e3440',        // nord0
    textMuted: '#4c566a',   // nord3
    primary: '#5e81ac',     // nord10 (darker blue for light)
    secondary: '#0d9488',   // teal (adjusted cyan)
    success: '#4d7c0f',     // darker green
    warning: '#a16207',     // darker yellow
    error: '#b91c1c',       // darker red
    info: '#5e81ac',
    selection: '#5e81ac',
    badgeMerged: '#0d9488',
    badgeLocked: '#b91c1c',
    badgeMain: '#5e81ac',
    actionKey: '#5e81ac',
    actionDisabled: '#9ca3af',
    actionHighlight: '#0d9488',
  },
};

/**
 * Monokai theme - warm colors, orange/yellow focused
 * https://monokai.pro/
 */
export const monokaiTheme: Theme = {
  name: 'monokai',
  dark: {
    text: '#f8f8f2',        // foreground
    textMuted: '#75715e',   // comment
    primary: '#e6db74',     // yellow
    secondary: '#ae81ff',   // purple
    success: '#a6e22e',     // green
    warning: '#e6db74',     // yellow
    error: '#f92672',       // red/pink
    info: '#66d9ef',        // cyan
    selection: '#e6db74',
    badgeMerged: '#ae81ff',
    badgeLocked: '#f92672',
    badgeMain: '#a6e22e',
    actionKey: '#e6db74',
    actionDisabled: '#75715e',
    actionHighlight: '#ae81ff',
  },
  light: {
    text: '#272822',        // background as text
    textMuted: '#75715e',   // comment
    primary: '#9a8000',     // darker yellow
    secondary: '#7c3aed',   // purple (adjusted)
    success: '#65a30d',     // darker green
    warning: '#9a8000',     // darker yellow
    error: '#db2777',       // pink (adjusted)
    info: '#0891b2',        // cyan (adjusted)
    selection: '#9a8000',
    badgeMerged: '#7c3aed',
    badgeLocked: '#db2777',
    badgeMain: '#65a30d',
    actionKey: '#9a8000',
    actionDisabled: '#75715e',
    actionHighlight: '#7c3aed',
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
 * Terminal mode (light or dark background)
 */
let terminalMode: 'light' | 'dark' = 'dark';

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
 * Get the current color palette (based on terminal mode)
 */
export function getColors(): ColorPalette {
  return currentTheme[terminalMode];
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
 * Set terminal mode (light or dark)
 */
export function setTerminalMode(mode: 'light' | 'dark'): void {
  terminalMode = mode;
}

/**
 * Get current terminal mode
 */
export function getTerminalMode(): 'light' | 'dark' {
  return terminalMode;
}

/**
 * Detect terminal color scheme
 * Returns 'light' or 'dark' based on environment hints
 */
export function detectTerminalMode(): 'light' | 'dark' {
  // Check COLORFGBG environment variable (format: "fg;bg" where higher bg = light)
  const colorFgBg = process.env.COLORFGBG;
  if (colorFgBg) {
    const parts = colorFgBg.split(';');
    const bg = parseInt(parts[parts.length - 1], 10);
    // Background colors 0-6 are typically dark, 7+ are light
    if (!isNaN(bg) && bg >= 7) {
      return 'light';
    }
    if (!isNaN(bg) && bg < 7) {
      return 'dark';
    }
  }

  // Check macOS appearance (works in some terminals)
  const appleInterface = process.env.APPLE_INTERFACE_STYLE;
  if (appleInterface === 'Light') {
    return 'light';
  }

  // Check terminal-specific variables
  const termProgram = process.env.TERM_PROGRAM;
  
  // iTerm2 can set this
  const itermProfile = process.env.ITERM_PROFILE;
  if (itermProfile?.toLowerCase().includes('light')) {
    return 'light';
  }

  // Ghostty sets GHOSTTY_RESOURCES_DIR but doesn't expose theme directly
  // Check if common light theme names appear in shell config
  const shellTheme = process.env.BASE16_THEME || process.env.TERMINAL_THEME || '';
  if (shellTheme.toLowerCase().includes('light')) {
    return 'light';
  }

  // Default to dark (most common terminal setup)
  return 'dark';
}

/**
 * Auto-detect and set terminal mode
 */
export function autoDetectTerminalMode(): void {
  terminalMode = detectTerminalMode();
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
 * Convert color to fg prop value
 * With hex colors, we pass them through directly
 */
export function toFg(color: string | undefined): string | undefined {
  return color;
}
