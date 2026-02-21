import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type EditorKey = 'antigravity' | 'cursor' | 'vscode';

export interface AgLoaderConfig {
  registryPath: string;
}

export interface CategoryEntry {
  name: string;
  files: string[];
  absPath: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG_FILE = path.join(os.homedir(), '.ag-loader.json');

export const DEFAULT_REGISTRY = path.join(os.homedir(), '.ag-skills');

export async function readConfig(): Promise<AgLoaderConfig> {
  if (!(await fs.pathExists(CONFIG_FILE))) return { registryPath: DEFAULT_REGISTRY };
  try {
    const raw = await fs.readJson(CONFIG_FILE);
    return { registryPath: raw.registryPath ?? DEFAULT_REGISTRY };
  } catch {
    return { registryPath: DEFAULT_REGISTRY };
  }
}

export async function writeConfig(config: AgLoaderConfig): Promise<void> {
  await fs.writeJson(CONFIG_FILE, config, { spaces: 2 });
}

export async function getActiveRegistryPath(): Promise<string> {
  return (await readConfig()).registryPath;
}

// ─── Helpers de navegación (Editor → Stack → Category) ───────────────────────

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
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => e.name);

  if (subDirs.length === 0) {
    return [{ name: '__root__', files: rootMd, absPath: stackPath }];
  }

  const cats: CategoryEntry[] = [];
  for (const dir of subDirs) {
    const catPath = path.join(stackPath, dir.name);
    const files = (await fs.readdir(catPath, { withFileTypes: true }))
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
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
