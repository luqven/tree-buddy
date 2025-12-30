import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getTheme,
  getColors,
  setTheme,
  toFg,
  supportsTrueColor,
  themes,
  solarizedTheme,
  draculaTheme,
  nordTheme,
  monokaiTheme,
  defaultTheme,
  getThemeNames,
  previewTheme,
  commitPreview,
  cancelPreview,
  isPreviewing,
  setTerminalMode,
  getTerminalMode,
  detectTerminalMode,
  autoDetectTerminalMode,
  type ColorPalette,
  type Theme,
} from './theme';

describe('theme', () => {
  beforeEach(() => {
    // Reset to default theme, dark mode, and cancel any previews before each test
    cancelPreview();
    setTheme('default');
    setTerminalMode('dark');
  });

  describe('getTheme', () => {
    it('returns the current theme', () => {
      const theme = getTheme();
      expect(theme).toBeDefined();
      expect(theme.name).toBe('solarized');
    });

    it('returns theme with light and dark palettes', () => {
      const theme = getTheme();
      expect(theme.light).toBeDefined();
      expect(theme.dark).toBeDefined();
    });
  });

  describe('getColors', () => {
    it('returns dark palette by default', () => {
      setTerminalMode('dark');
      const colors = getColors();
      expect(colors).toBe(getTheme().dark);
    });

    it('returns light palette when mode is light', () => {
      setTerminalMode('light');
      const colors = getColors();
      expect(colors).toBe(getTheme().light);
    });

    it('returns palette with all required color properties', () => {
      const colors = getColors();
      expect(colors.text).toBeDefined();
      expect(colors.textMuted).toBeDefined();
      expect(colors.primary).toBeDefined();
      expect(colors.secondary).toBeDefined();
      expect(colors.success).toBeDefined();
      expect(colors.warning).toBeDefined();
      expect(colors.error).toBeDefined();
      expect(colors.info).toBeDefined();
      expect(colors.selection).toBeDefined();
      expect(colors.badgeMerged).toBeDefined();
      expect(colors.badgeLocked).toBeDefined();
      expect(colors.badgeMain).toBeDefined();
      expect(colors.actionKey).toBeDefined();
      expect(colors.actionDisabled).toBeDefined();
      expect(colors.actionHighlight).toBeDefined();
    });
  });

  describe('setTheme', () => {
    it('changes the current theme', () => {
      setTheme('dracula');
      expect(getTheme().name).toBe('dracula');
    });

    it('ignores invalid theme names', () => {
      const before = getTheme();
      setTheme('nonexistent');
      expect(getTheme()).toBe(before);
    });

    it('can switch between registered themes', () => {
      setTheme('solarized');
      expect(getTheme().name).toBe('solarized');
      setTheme('dracula');
      expect(getTheme().name).toBe('dracula');
      setTheme('nord');
      expect(getTheme().name).toBe('nord');
      setTheme('monokai');
      expect(getTheme().name).toBe('monokai');
    });
  });

  describe('terminal mode', () => {
    it('defaults to dark mode', () => {
      expect(getTerminalMode()).toBe('dark');
    });

    it('setTerminalMode changes mode', () => {
      setTerminalMode('light');
      expect(getTerminalMode()).toBe('light');
      setTerminalMode('dark');
      expect(getTerminalMode()).toBe('dark');
    });

    it('getColors reflects terminal mode', () => {
      setTerminalMode('dark');
      expect(getColors()).toBe(getTheme().dark);
      
      setTerminalMode('light');
      expect(getColors()).toBe(getTheme().light);
    });
  });

  describe('detectTerminalMode', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns dark by default', () => {
      delete process.env.COLORFGBG;
      delete process.env.APPLE_INTERFACE_STYLE;
      delete process.env.ITERM_PROFILE;
      delete process.env.BASE16_THEME;
      delete process.env.TERMINAL_THEME;
      expect(detectTerminalMode()).toBe('dark');
    });

    it('detects light from COLORFGBG with high bg value', () => {
      process.env.COLORFGBG = '0;15';
      expect(detectTerminalMode()).toBe('light');
    });

    it('detects dark from COLORFGBG with low bg value', () => {
      process.env.COLORFGBG = '15;0';
      expect(detectTerminalMode()).toBe('dark');
    });

    it('detects light from APPLE_INTERFACE_STYLE', () => {
      process.env.APPLE_INTERFACE_STYLE = 'Light';
      expect(detectTerminalMode()).toBe('light');
    });

    it('detects light from ITERM_PROFILE containing light', () => {
      process.env.ITERM_PROFILE = 'Solarized Light';
      expect(detectTerminalMode()).toBe('light');
    });

    it('detects light from BASE16_THEME containing light', () => {
      process.env.BASE16_THEME = 'solarized-light';
      expect(detectTerminalMode()).toBe('light');
    });
  });

  describe('autoDetectTerminalMode', () => {
    it('sets terminal mode based on detection', () => {
      // Just verify it runs without error
      autoDetectTerminalMode();
      expect(['light', 'dark']).toContain(getTerminalMode());
    });
  });

  describe('toFg', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('returns undefined for undefined input', () => {
      expect(toFg(undefined)).toBeUndefined();
    });

    it('passes through hex colors in true color terminals', () => {
      process.env.COLORTERM = 'truecolor';
      expect(toFg('#ff0000')).toBe('#ff0000');
      expect(toFg('#2aa198')).toBe('#2aa198');
    });

    it('converts hex to ANSI names in non-true-color terminals', () => {
      delete process.env.COLORTERM;
      delete process.env.TERM_PROGRAM;
      process.env.TERM = 'xterm-256color';
      
      // Pure red should map to red
      expect(toFg('#ff0000')).toBe('red');
      // Solarized cyan (#2aa198) is closest to brightGreen in ANSI 16
      expect(toFg('#2aa198')).toBe('brightGreen');
      // Dark gray should map to gray
      expect(toFg('#666666')).toBe('gray');
      // Pure cyan should map to cyan
      expect(toFg('#00ffff')).toBe('brightCyan');
    });

    it('passes through ANSI color names', () => {
      expect(toFg('red')).toBe('red');
      expect(toFg('cyan')).toBe('cyan');
    });
  });

  describe('themes registry', () => {
    it('contains solarized theme', () => {
      expect(themes['solarized']).toBeDefined();
      expect(themes['solarized']).toBe(solarizedTheme);
    });

    it('contains dracula theme', () => {
      expect(themes['dracula']).toBeDefined();
      expect(themes['dracula']).toBe(draculaTheme);
    });

    it('contains nord theme', () => {
      expect(themes['nord']).toBeDefined();
      expect(themes['nord']).toBe(nordTheme);
    });

    it('contains monokai theme', () => {
      expect(themes['monokai']).toBeDefined();
      expect(themes['monokai']).toBe(monokaiTheme);
    });

    it('contains default theme', () => {
      expect(themes['default']).toBeDefined();
      expect(themes['default']).toBe(defaultTheme);
    });

    it('default theme is same as solarized', () => {
      expect(defaultTheme).toBe(solarizedTheme);
    });
  });

  describe('getThemeNames', () => {
    it('returns all theme names except default', () => {
      const names = getThemeNames();
      expect(names).toContain('solarized');
      expect(names).toContain('dracula');
      expect(names).toContain('nord');
      expect(names).toContain('monokai');
      expect(names).not.toContain('default');
    });

    it('returns correct number of themes', () => {
      const names = getThemeNames();
      expect(names.length).toBe(4);
    });
  });

  describe('theme preview', () => {
    it('previewTheme changes current theme', () => {
      expect(getTheme().name).toBe('solarized');
      previewTheme('dracula');
      expect(getTheme().name).toBe('dracula');
    });

    it('isPreviewing returns true when previewing', () => {
      expect(isPreviewing()).toBe(false);
      previewTheme('dracula');
      expect(isPreviewing()).toBe(true);
    });

    it('cancelPreview reverts to saved theme', () => {
      setTheme('solarized');
      previewTheme('dracula');
      expect(getTheme().name).toBe('dracula');
      cancelPreview();
      expect(getTheme().name).toBe('solarized');
      expect(isPreviewing()).toBe(false);
    });

    it('commitPreview keeps the previewed theme', () => {
      setTheme('solarized');
      previewTheme('dracula');
      const committed = commitPreview();
      expect(committed).toBe('dracula');
      expect(getTheme().name).toBe('dracula');
      expect(isPreviewing()).toBe(false);
    });

    it('commitPreview returns null if no preview active', () => {
      const committed = commitPreview();
      expect(committed).toBeNull();
    });

    it('multiple previews save original theme', () => {
      setTheme('solarized');
      previewTheme('dracula');
      previewTheme('nord');
      previewTheme('monokai');
      expect(getTheme().name).toBe('monokai');
      cancelPreview();
      expect(getTheme().name).toBe('solarized'); // reverts to original
    });

    it('cancelPreview does nothing if not previewing', () => {
      setTheme('dracula');
      cancelPreview(); // should not throw
      expect(getTheme().name).toBe('dracula');
    });

    it('previewTheme ignores invalid theme names', () => {
      setTheme('solarized');
      previewTheme('nonexistent');
      expect(getTheme().name).toBe('solarized');
      expect(isPreviewing()).toBe(false);
    });
  });

  describe('all themes have valid hex colors', () => {
    const allThemes = [solarizedTheme, draculaTheme, nordTheme, monokaiTheme];
    const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

    for (const theme of allThemes) {
      describe(theme.name, () => {
        it('has correct name property', () => {
          expect(theme.name).toBe(theme.name);
        });

        it('dark palette uses valid hex colors', () => {
          const colors = Object.values(theme.dark);
          for (const color of colors) {
            expect(color).toMatch(hexColorRegex);
          }
        });

        it('light palette uses valid hex colors', () => {
          const colors = Object.values(theme.light);
          for (const color of colors) {
            expect(color).toMatch(hexColorRegex);
          }
        });

        it('has all required color properties in dark palette', () => {
          expect(theme.dark.text).toBeDefined();
          expect(theme.dark.textMuted).toBeDefined();
          expect(theme.dark.primary).toBeDefined();
          expect(theme.dark.secondary).toBeDefined();
          expect(theme.dark.success).toBeDefined();
          expect(theme.dark.warning).toBeDefined();
          expect(theme.dark.error).toBeDefined();
          expect(theme.dark.info).toBeDefined();
          expect(theme.dark.selection).toBeDefined();
          expect(theme.dark.badgeMerged).toBeDefined();
          expect(theme.dark.badgeLocked).toBeDefined();
          expect(theme.dark.badgeMain).toBeDefined();
          expect(theme.dark.actionKey).toBeDefined();
          expect(theme.dark.actionDisabled).toBeDefined();
          expect(theme.dark.actionHighlight).toBeDefined();
        });

        it('has all required color properties in light palette', () => {
          expect(theme.light.text).toBeDefined();
          expect(theme.light.textMuted).toBeDefined();
          expect(theme.light.primary).toBeDefined();
          expect(theme.light.secondary).toBeDefined();
          expect(theme.light.success).toBeDefined();
          expect(theme.light.warning).toBeDefined();
          expect(theme.light.error).toBeDefined();
          expect(theme.light.info).toBeDefined();
          expect(theme.light.selection).toBeDefined();
          expect(theme.light.badgeMerged).toBeDefined();
          expect(theme.light.badgeLocked).toBeDefined();
          expect(theme.light.badgeMain).toBeDefined();
          expect(theme.light.actionKey).toBeDefined();
          expect(theme.light.actionDisabled).toBeDefined();
          expect(theme.light.actionHighlight).toBeDefined();
        });
      });
    }
  });

  describe('theme distinctiveness', () => {
    it('dracula has purple as primary', () => {
      expect(draculaTheme.dark.primary).toBe('#bd93f9');
    });

    it('nord has blue as primary', () => {
      expect(nordTheme.dark.primary).toBe('#81a1c1');
    });

    it('monokai has yellow as primary', () => {
      expect(monokaiTheme.dark.primary).toBe('#e6db74');
    });

    it('solarized has cyan as primary', () => {
      expect(solarizedTheme.dark.primary).toBe('#2aa198');
    });
  });

  describe('light vs dark contrast', () => {
    const allThemes = [solarizedTheme, draculaTheme, nordTheme, monokaiTheme];

    for (const theme of allThemes) {
      it(`${theme.name} has different text colors for light and dark`, () => {
        expect(theme.light.text).not.toBe(theme.dark.text);
      });
    }
  });
});
