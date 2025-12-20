import { describe, it, expect } from 'vitest';
import { parseScopes, buildTree, flatten, countBranches, findNode } from './scope';
import { Branch, GitStatus } from '../core/types';

const mkBranch = (name: string): Branch => ({
  name,
  path: `/tmp/${name}`,
  status: { ahead: 0, behind: 0, dirty: false, ts: 0 } as GitStatus,
});

describe('parseScopes', () => {
  it('splits by delimiter', () => {
    expect(parseScopes('l/ENG-123/my-feature', '/')).toEqual([
      'l',
      'ENG-123',
      'my-feature',
    ]);
  });

  it('handles single segment', () => {
    expect(parseScopes('main', '/')).toEqual(['main']);
  });

  it('filters empty segments', () => {
    expect(parseScopes('a//b/', '/')).toEqual(['a', 'b']);
  });

  it('works with different delimiters', () => {
    expect(parseScopes('a.b.c', '.')).toEqual(['a', 'b', 'c']);
  });
});

describe('buildTree', () => {
  it('creates flat list when disabled', () => {
    const branches = [mkBranch('main'), mkBranch('feature')];
    const tree = buildTree(branches, { delim: '/', enabled: false });

    expect(tree.length).toBe(2);
    expect(tree[0].name).toBe('main');
    expect(tree[0].branch).toBe(branches[0]);
    expect(tree[0].children).toEqual([]);
  });

  it('groups by scope when enabled', () => {
    const branches = [
      mkBranch('l/ENG-123/feat-a'),
      mkBranch('l/ENG-123/feat-b'),
      mkBranch('l/ENG-456/other'),
      mkBranch('main'),
    ];
    const tree = buildTree(branches, { delim: '/', enabled: true });

    // Should have 'l' and 'main' at root
    expect(tree.length).toBe(2);

    const l = tree.find((n) => n.name === 'l');
    expect(l).toBeDefined();
    expect(l!.children.length).toBe(2); // ENG-123, ENG-456

    const eng123 = l!.children.find((n) => n.name === 'ENG-123');
    expect(eng123).toBeDefined();
    expect(eng123!.children.length).toBe(2); // feat-a, feat-b

    const main = tree.find((n) => n.name === 'main');
    expect(main).toBeDefined();
    expect(main!.branch).toBe(branches[3]);
  });

  it('handles deeply nested branches', () => {
    const branches = [mkBranch('a/b/c/d/e')];
    const tree = buildTree(branches, { delim: '/', enabled: true });

    expect(tree.length).toBe(1);
    expect(tree[0].name).toBe('a');
    expect(tree[0].children[0].name).toBe('b');
    expect(tree[0].children[0].children[0].name).toBe('c');
  });
});

describe('flatten', () => {
  it('returns all branches from tree', () => {
    const branches = [
      mkBranch('l/ENG-123/feat'),
      mkBranch('main'),
    ];
    const tree = buildTree(branches, { delim: '/', enabled: true });
    const flat = flatten(tree);

    expect(flat.length).toBe(2);
    expect(flat.map((b) => b.name).sort()).toEqual(['l/ENG-123/feat', 'main']);
  });
});

describe('countBranches', () => {
  it('counts all branches in tree', () => {
    const branches = [
      mkBranch('l/a'),
      mkBranch('l/b'),
      mkBranch('main'),
    ];
    const tree = buildTree(branches, { delim: '/', enabled: true });

    expect(countBranches(tree)).toBe(3);
  });

  it('returns 0 for empty tree', () => {
    expect(countBranches([])).toBe(0);
  });
});

describe('findNode', () => {
  it('finds node by path', () => {
    const branches = [mkBranch('l/ENG-123/feat')];
    const tree = buildTree(branches, { delim: '/', enabled: true });

    const node = findNode(tree, 'l/ENG-123', '/');
    expect(node).toBeDefined();
    expect(node!.name).toBe('ENG-123');
  });

  it('returns null for non-existent path', () => {
    const branches = [mkBranch('main')];
    const tree = buildTree(branches, { delim: '/', enabled: true });

    expect(findNode(tree, 'nonexistent', '/')).toBeNull();
  });
});
