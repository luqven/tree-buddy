import { Branch, ScopeNode } from '../core/types';

interface ScopeOpts {
  delim: string;
  enabled: boolean;
}

/**
 * Parse branch name into scope segments
 */
export function parseScopes(name: string, delim: string): string[] {
  return name.split(delim).filter((s) => s.length > 0);
}

/**
 * Build a scope tree from branches
 */
export function buildTree(branches: Branch[], opts: ScopeOpts): ScopeNode[] {
  if (!opts.enabled) {
    // Flat list - each branch is a root node
    return branches.map((b) => ({
      name: b.name,
      children: [],
      branch: b,
    }));
  }

  const root: ScopeNode[] = [];

  for (const br of branches) {
    const parts = parseScopes(br.name, opts.delim);
    insertBranch(root, parts, br);
  }

  return root;
}

/**
 * Insert branch into tree at the correct path
 */
function insertBranch(nodes: ScopeNode[], parts: string[], br: Branch): void {
  if (parts.length === 0) return;

  const [head, ...rest] = parts;
  let node = nodes.find((n) => n.name === head);

  if (!node) {
    node = { name: head, children: [] };
    nodes.push(node);
  }

  if (rest.length === 0) {
    // Leaf node
    node.branch = br;
  } else {
    insertBranch(node.children, rest, br);
  }
}

/**
 * Flatten tree back to sorted branch list
 */
export function flatten(nodes: ScopeNode[]): Branch[] {
  const result: Branch[] = [];

  function walk(ns: ScopeNode[]) {
    for (const n of ns) {
      if (n.branch) {
        result.push(n.branch);
      }
      walk(n.children);
    }
  }

  walk(nodes);
  return result;
}

/**
 * Get display path for a node (for menu rendering)
 */
export function getPath(node: ScopeNode, delim: string): string {
  const parts: string[] = [];

  function collect(n: ScopeNode) {
    parts.push(n.name);
  }

  collect(node);
  return parts.join(delim);
}

/**
 * Count total branches in a scope tree
 */
export function countBranches(nodes: ScopeNode[]): number {
  let count = 0;

  function walk(ns: ScopeNode[]) {
    for (const n of ns) {
      if (n.branch) count++;
      walk(n.children);
    }
  }

  walk(nodes);
  return count;
}

/**
 * Find node by full path
 */
export function findNode(nodes: ScopeNode[], path: string, delim: string): ScopeNode | null {
  const parts = parseScopes(path, delim);
  let cur = nodes;

  for (const p of parts) {
    const node = cur.find((n) => n.name === p);
    if (!node) return null;
    if (parts.indexOf(p) === parts.length - 1) return node;
    cur = node.children;
  }

  return null;
}
