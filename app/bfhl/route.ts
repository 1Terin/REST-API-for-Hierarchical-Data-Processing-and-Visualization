import { NextRequest, NextResponse } from 'next/server';

interface Hierarchy {
  root: string;
  tree: Record<string, any>;
  depth?: number;
  has_cycle?: true;
}

interface Summary {
  total_trees: number;
  total_cycles: number;
  largest_tree_root: string;
}

function isValid(entry: string): boolean {
  const trimmed = entry.trim();
  if (!/^[A-Z]->[A-Z]$/.test(trimmed)) return false;
  const [x, y] = trimmed.split('->');
  return x !== y;
}

function detectCycles(nodes: string[], graph: Map<string, string[]>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const child of graph.get(node) || []) {
      if (dfs(child)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node) && dfs(node)) return true;
  }
  return false;
}

function buildTree(node: string, graph: Map<string, string[]>, childToParent: Map<string, string>): Record<string, any> {
  const children = graph.get(node) || [];
  const tree: Record<string, any> = {};
  for (const child of children) {
    if (childToParent.get(child) === node) {
      tree[child] = buildTree(child, graph, childToParent);
    }
  }
  return tree;
}

function getDepth(node: string, graph: Map<string, string[]>, childToParent: Map<string, string>): number {
  let depth = 1;
  for (const child of graph.get(node) || []) {
    if (childToParent.get(child) === node) {
      depth = Math.max(depth, 1 + getDepth(child, graph, childToParent));
    }
  }
  return depth;
}

function getConnectedGroups(allNodes: Set<string>, undirGraph: Map<string, string[]>): string[][] {
  const visited = new Set<string>();
  const groups: string[][] = [];

  for (const node of allNodes) {
    if (visited.has(node)) continue;
    const stack = [node];
    const group: string[] = [];
    while (stack.length) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      group.push(current);
      for (const neighbor of undirGraph.get(current) || []) {
        if (!visited.has(neighbor)) stack.push(neighbor);
      }
    }
    groups.push(group);
  }

  return groups;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data: unknown = body?.data;
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const invalid_entries: string[] = [];
    const duplicateSet = new Set<string>();
    const seen = new Set<string>();
    const edges: string[] = [];

    for (const rawEntry of data) {
      if (typeof rawEntry !== 'string') {
        invalid_entries.push(String(rawEntry));
        continue;
      }
      const entry = rawEntry.trim();
      if (!isValid(entry)) {
        invalid_entries.push(rawEntry);
        continue;
      }
      if (seen.has(entry)) {
        duplicateSet.add(entry);
      } else {
        seen.add(entry);
        edges.push(entry);
      }
    }

    const duplicate_edges = Array.from(duplicateSet);
    const graph = new Map<string, string[]>();
    const reverseGraph = new Map<string, string[]>();
    const childToParent = new Map<string, string>();
    const allNodes = new Set<string>();

    for (const edge of edges) {
      const [parent, child] = edge.split('->');
      allNodes.add(parent);
      allNodes.add(child);

      if (!graph.has(parent)) graph.set(parent, []);
      graph.get(parent)!.push(child);
      if (!reverseGraph.has(child)) reverseGraph.set(child, []);
      reverseGraph.get(child)!.push(parent);
      if (!childToParent.has(child)) {
        childToParent.set(child, parent);
      }
    }

    const undirGraph = new Map<string, string[]>();
    for (const node of allNodes) {
      undirGraph.set(node, []);
    }
    for (const [parent, children] of graph) {
      for (const child of children) {
        undirGraph.get(parent)!.push(child);
        undirGraph.get(child)!.push(parent);
      }
    }

    const groups = getConnectedGroups(allNodes, undirGraph);
    const hierarchies: any[] = [];

    for (const group of groups) {
      const groupSet = new Set(group);
      const groupGraph = new Map<string, string[]>();
      for (const node of group) {
        groupGraph.set(node, graph.get(node) || []);
      }

      const cycle = detectCycles(group, groupGraph);
      if (cycle) {
        hierarchies.push({
          root: group.sort()[0],
          tree: {},
          has_cycle: true,
        });
        continue;
      }

      const roots = group.filter((node) => {
        const parents = reverseGraph.get(node) || [];
        return parents.every((parent) => !groupSet.has(parent));
      });

      const rootNode = roots.length ? roots.sort()[0] : group.sort()[0];
      const tree = { [rootNode]: buildTree(rootNode, graph, childToParent) };
      const depth = getDepth(rootNode, graph, childToParent);
      hierarchies.push({ root: rootNode, tree, depth });
    }

    const trees = hierarchies.filter((item) => !item.has_cycle);
    const total_trees = trees.length;
    const total_cycles = hierarchies.length - total_trees;

    let largest_tree_root = '';
    let maxDepth = 0;
    for (const treeItem of trees) {
      if ((treeItem.depth ?? 0) > maxDepth) {
        maxDepth = treeItem.depth;
        largest_tree_root = treeItem.root;
      } else if ((treeItem.depth ?? 0) === maxDepth) {
        if (!largest_tree_root || treeItem.root < largest_tree_root) {
          largest_tree_root = treeItem.root;
        }
      }
    }

    const summary: Summary = {
      total_trees,
      total_cycles,
      largest_tree_root,
    };

    return NextResponse.json({
      user_id: 'terin_17091999',
      email_id: 'terin@college.edu',
      college_roll_number: 'RA2311003020624',
      hierarchies,
      invalid_entries,
      duplicate_edges,
      summary,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
