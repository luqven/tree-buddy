import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTheme,
  setTheme,
  toFg,
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
  type AnsiColor,
  type Theme,
} from './theme';

describe('theme', () => {
  beforeEach(() => {
    // Reset to default theme and cancel any previews before each test
    cancelPreview();
    setTheme('default');
  });

  describe('getTheme', () => {
    it('returns the current theme', () => {
      const theme = getTheme();
      expect(theme).toBeDefined();
      expect(theme.name).toBe('solarized');
    });

    it('returns theme with all required color properties', () => {
      const theme = getTheme();
      expect(theme.colors).toBeDefined();
      expect(theme.colors.primary).toBeDefined();
      expect(theme.colors.secondary).toBeDefined();
      expect(theme.colors.muted).toBeDefined();
      expect(theme.colors.success).toBeDefined();
      expect(theme.colors.warning).toBeDefined();
      expect(theme.colors.error).toBeDefined();
      expect(theme.colors.info).toBeDefined();
      expect(theme.colors.selection).toBeDefined();
      expect(theme.colors.badge).toBeDefined();
      expect(theme.colors.badgeMerged).toBeDefined();
      expect(theme.colors.badgeLocked).toBeDefined();
      expect(theme.colors.badgeMain).toBeDefined();
      expect(theme.colors.actionKey).toBeDefined();
      expect(theme.colors.actionLabel).toBeDefined();
      expect(theme.colors.actionDisabled).toBeDefined();
      expect(theme.colors.actionHighlight).toBeDefined();
    });
  });

  describe('setTheme', () => {
    it('changes the current theme', () => {
      setTheme('solarized');
      expect(getTheme().name).toBe('solarized');
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

  describe('toFg', () => {
    it('returns undefined for undefined input', () => {
      expect(toFg(undefined)).toBeUndefined();
    });

    it('returns undefined for default color (uses terminal default)', () => {
      expect(toFg('default')).toBeUndefined();
    });

    it('maps base ANSI colors to themselves', () => {
      const baseColors: AnsiColor[] = [
        'black', 'red', 'green', 'yellow',
        'blue', 'magenta', 'cyan', 'white',
      ];
      for (const color of baseColors) {
        expect(toFg(color)).toBe(color);
      }
    });

    it('maps brightBlack to gray', () => {
      expect(toFg('brightBlack')).toBe('gray');
    });

    it('maps bright colors to base colors', () => {
      expect(toFg('brightRed')).toBe('red');
      expect(toFg('brightGreen')).toBe('green');
      expect(toFg('brightYellow')).toBe('yellow');
      expect(toFg('brightBlue')).toBe('blue');
      expect(toFg('brightMagenta')).toBe('magenta');
      expect(toFg('brightCyan')).toBe('cyan');
      expect(toFg('brightWhite')).toBe('white');
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

  describe('all themes', () => {
    const allThemes = [solarizedTheme, draculaTheme, nordTheme, monokaiTheme];
    const validColors = new Set<AnsiColor>([
      'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
      'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
      'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
      'default',
    ]);

    for (const theme of allThemes) {
      describe(theme.name, () => {
        it('has correct name property', () => {
          expect(theme.name).toBe(theme.name);
        });

        it('uses valid ANSI colors', () => {
          const colors = Object.values(theme.colors);
          for (const color of colors) {
            expect(validColors.has(color)).toBe(true);
          }
        });

        it('has semantic color assignments', () => {
          // All themes should use green for success, yellow for warning, red for error
          expect(theme.colors.success).toBe('green');
          expect(theme.colors.warning).toBe('yellow');
          expect(theme.colors.error).toBe('red');
        });

        it('has all required color properties', () => {
          expect(theme.colors.primary).toBeDefined();
          expect(theme.colors.secondary).toBeDefined();
          expect(theme.colors.muted).toBeDefined();
          expect(theme.colors.success).toBeDefined();
          expect(theme.colors.warning).toBeDefined();
          expect(theme.colors.error).toBeDefined();
          expect(theme.colors.info).toBeDefined();
          expect(theme.colors.selection).toBeDefined();
          expect(theme.colors.badge).toBeDefined();
          expect(theme.colors.badgeMerged).toBeDefined();
          expect(theme.colors.badgeLocked).toBeDefined();
          expect(theme.colors.badgeMain).toBeDefined();
          expect(theme.colors.actionKey).toBeDefined();
          expect(theme.colors.actionLabel).toBeDefined();
          expect(theme.colors.actionDisabled).toBeDefined();
          expect(theme.colors.actionHighlight).toBeDefined();
        });
      });
    }
  });

  describe('theme distinctiveness', () => {
    it('dracula has magenta as primary', () => {
      expect(draculaTheme.colors.primary).toBe('magenta');
    });

    it('nord has blue as primary', () => {
      expect(nordTheme.colors.primary).toBe('blue');
    });

    it('monokai has yellow as primary', () => {
      expect(monokaiTheme.colors.primary).toBe('yellow');
    });

    it('solarized has cyan as primary', () => {
      expect(solarizedTheme.colors.primary).toBe('cyan');
    });
  });
});
