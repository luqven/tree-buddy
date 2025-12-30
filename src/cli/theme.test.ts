import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTheme,
  setTheme,
  toFg,
  themes,
  solarizedTheme,
  defaultTheme,
  type AnsiColor,
  type Theme,
} from './theme';

describe('theme', () => {
  beforeEach(() => {
    // Reset to default theme before each test
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
      setTheme('default');
      expect(getTheme().name).toBe('solarized'); // default is same as solarized
    });
  });

  describe('toFg', () => {
    it('returns undefined for undefined input', () => {
      expect(toFg(undefined)).toBeUndefined();
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

    it('contains default theme', () => {
      expect(themes['default']).toBeDefined();
      expect(themes['default']).toBe(defaultTheme);
    });

    it('default theme is same as solarized', () => {
      expect(defaultTheme).toBe(solarizedTheme);
    });
  });

  describe('solarizedTheme', () => {
    it('has correct name', () => {
      expect(solarizedTheme.name).toBe('solarized');
    });

    it('uses valid ANSI colors', () => {
      const validColors = new Set<AnsiColor>([
        'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
        'brightBlack', 'brightRed', 'brightGreen', 'brightYellow',
        'brightBlue', 'brightMagenta', 'brightCyan', 'brightWhite',
      ]);

      const colors = Object.values(solarizedTheme.colors);
      for (const color of colors) {
        expect(validColors.has(color)).toBe(true);
      }
    });

    it('has semantic color assignments', () => {
      // Verify semantic colors make sense
      expect(solarizedTheme.colors.success).toBe('green');
      expect(solarizedTheme.colors.warning).toBe('yellow');
      expect(solarizedTheme.colors.error).toBe('red');
    });
  });
});
