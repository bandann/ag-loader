import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EditorKey = 'antigravity' | 'cursor' | 'vscode';
export type ClaudeAITool = 'claude-code' | 'codex' | 'copilot' | 'other';

export interface AgLoaderConfig {
  registryPath: string;
  agentsPath: string;
}

export interface CategoryEntry {
  name: string;
  files: string[];
  absPath: string;
}

export interface AgentStackEntry {
  name: string;     // agent filename
  absPath: string;  // full path to file
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(os.homedir(), '.ag-loader.json');

export const DEFAULT_REGISTRY       = path.join(os.homedir(), '.ag-skills');
export const DEFAULT_AGENTS_REGISTRY = path.join(os.homedir(), '.ag-agents');

export async function readConfig(): Promise<AgLoaderConfig> {
  if (!(await fs.pathExists(CONFIG_FILE))) {
    return { registryPath: DEFAULT_REGISTRY, agentsPath: DEFAULT_AGENTS_REGISTRY };
  }
  try {
    const raw = await fs.readJson(CONFIG_FILE);
    return {
      registryPath: raw.registryPath ?? DEFAULT_REGISTRY,
      agentsPath:   raw.agentsPath   ?? DEFAULT_AGENTS_REGISTRY,
    };
  } catch {
    return { registryPath: DEFAULT_REGISTRY, agentsPath: DEFAULT_AGENTS_REGISTRY };
  }
}

export async function writeConfig(config: Partial<AgLoaderConfig>): Promise<void> {
  const current = await readConfig();
  await fs.writeJson(CONFIG_FILE, { ...current, ...config }, { spaces: 2 });
}

export async function getActiveRegistryPath(): Promise<string> {
  return (await readConfig()).registryPath;
}

export async function getActiveAgentsPath(): Promise<string> {
  return (await readConfig()).agentsPath;
}

// ─── Helpers de navegación de Skills (Editor → Stack → Category) ──────────────

/**
 * Devuelve la ruta `<registry>/<editor>/`
 */
export function getEditorPath(registryPath: string, editor: EditorKey): string {
  return path.join(registryPath, editor);
}

/**
 * Devuelve los stacks (subcarpetas) dentro de `<registry>/<editor>/`
 */
export async function getStacksForEditor(
  registryPath: string,
  editor: EditorKey
): Promise<string[]> {
  const editorPath = getEditorPath(registryPath, editor);
  await fs.ensureDir(editorPath);
  const entries = await fs.readdir(editorPath, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * Devuelve las categorías (subcarpetas) dentro de `<registry>/<editor>/<stack>/`.
 * Si no hay subcarpetas, devuelve '__root__' con los .md directos del stack.
 */
export async function getCategoriesForStack(
  registryPath: string,
  editor: EditorKey,
  stack: string
): Promise<CategoryEntry[]> {
  const stackPath = path.join(getEditorPath(registryPath, editor), stack);
  const entries = await fs.readdir(stackPath, { withFileTypes: true });

  const subDirs = entries.filter((e) => e.isDirectory());
  const rootMd  = entries
    .filter((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdc')))
    .map((e) => e.name);

  if (subDirs.length === 0) {
    return [{ name: '__root__', files: rootMd, absPath: stackPath }];
  }

  const cats: CategoryEntry[] = [];
  for (const dir of subDirs) {
    const catPath = path.join(stackPath, dir.name);
    const files = (await fs.readdir(catPath, { withFileTypes: true }))
      .filter((e) => e.isFile() && (e.name.endsWith('.md') || e.name.endsWith('.mdc')))
      .map((e) => e.name);
    cats.push({ name: dir.name, files, absPath: catPath });
  }

  return cats;
}

/**
 * Árbol completo para un editor específico (para `ag-loader list`).
 */
export async function getEditorTree(
  registryPath: string,
  editor: EditorKey
): Promise<{ stack: string; categories: CategoryEntry[] }[]> {
  const stacks = await getStacksForEditor(registryPath, editor);
  const tree = [];
  for (const stack of stacks) {
    const categories = await getCategoriesForStack(registryPath, editor, stack);
    tree.push({ stack, categories });
  }
  return tree;
}

// ─── Helpers de navegación de Agents (Tool → Stack) ──────────────────────────

/**
 * Devuelve los stacks disponibles para una herramienta dentro del registro de agentes.
 * Estructura: <agentsPath>/<tool>/<stack>/
 */
export async function getAgentStacksForTool(
  agentsPath: string,
  tool: string
): Promise<string[]> {
  const toolPath = path.join(agentsPath, tool);
  await fs.ensureDir(toolPath);
  const entries = await fs.readdir(toolPath, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

/**
 * Árbol completo de agentes: tool → stacks
 */
export async function getAgentsTree(
  agentsPath: string
): Promise<{ tool: string; stacks: string[] }[]> {
  if (!(await fs.pathExists(agentsPath))) return [];
  const entries = await fs.readdir(agentsPath, { withFileTypes: true });
  const tools = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const tree = [];
  for (const tool of tools) {
    const stacks = await getAgentStacksForTool(agentsPath, tool);
    tree.push({ tool, stacks });
  }
  return tree;
}
