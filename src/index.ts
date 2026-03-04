#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { ensureRegistryExists } from './registry';
import {
  readConfig,
  writeConfig,
  getActiveRegistryPath,
  getActiveAgentsPath,
  getStacksForEditor,
  getCategoriesForStack,
  getEditorTree,
  getAgentStacksForTool,
  getAgentsTree,
  DEFAULT_REGISTRY,
  DEFAULT_AGENTS_REGISTRY,
  type EditorKey,
  type CategoryEntry,
} from './config';

// ─── Editor definitions ───────────────────────────────────────────────────────

const EDITORS: { key: EditorKey; label: string; hint: string }[] = [
  { key: 'antigravity', label: 'Antigravity', hint: 'Skills en .agent/skills/ (SKILL.md)'              },
  { key: 'cursor',      label: 'Cursor',      hint: 'Reglas .mdc en .cursor/rules/'                   },
  { key: 'vscode',      label: 'VS Code',     hint: 'Instrucciones Copilot en .github/instructions/'  },
];

// ─── Globs por stack name ─────────────────────────────────────────────────────

const STACK_GLOBS: Record<string, string> = {
  react:     '**/*.{tsx,jsx,ts,js}',
  next:      '**/*.{tsx,jsx,ts,js}',
  vue:       '**/*.{vue,ts,js}',
  angular:   '**/*.{ts,html}',
  svelte:    '**/*.{svelte,ts}',
  shopify:   '**/*.{liquid,json}',
  node:      '**/*.{ts,js}',
  python:    '**/*.py',
  laravel:   '**/*.{php,blade.php}',
  nuxt:      '**/*.{vue,ts}',
};

function globForStack(stackName: string): string {
  const lower = stackName.toLowerCase();
  for (const [key, glob] of Object.entries(STACK_GLOBS)) {
    if (lower.includes(key)) return glob;
  }
  return '**/*';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extrae el primer H1 del contenido markdown como descripción */
function extractH1(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

/** Construye un bloque de frontmatter MDC para Cursor */
function buildMdcFrontmatter(opts: {
  description: string;
  globs: string;
  alwaysApply: boolean;
}): string {
  return `---\ndescription: ${opts.description}\nglobs: ${opts.globs}\nalwaysApply: ${opts.alwaysApply}\n---\n\n`;
}

/** Construye frontmatter YAML para Antigravity SKILL.md */
function buildSkillFrontmatter(opts: {
  name: string;
  description: string;
}): string {
  return `---\nname: ${opts.name}\ndescription: ${opts.description}\n---\n\n`;
}

/** Construye frontmatter para VS Code Copilot .instructions.md */
function buildCopilotFrontmatter(opts: { applyTo: string }): string {
  return `---\napplyTo: "${opts.applyTo}"\n---\n\n`;
}

/** Lee un archivo .md y devuelve su contenido, sin frontmatter si ya tiene */
async function readMarkdown(filePath: string): Promise<string> {
  const raw = await fs.readFile(filePath, 'utf-8');
  if (hasFrontmatter(raw)) {
    // Elimina el bloque frontmatter existente
    return raw.replace(/^---[\s\S]*?---\n+/, '').trimStart();
  }
  return raw;
}

// ─── Injection Logic ─────────────────────────────────────────────────────────

async function injectAntigravity(category: CategoryEntry): Promise<void> {
  const skillsDir = path.join(process.cwd(), '.agent', 'skills');
  await fs.ensureDir(skillsDir);

  for (const file of category.files) {
    const src      = path.join(category.absPath, file);
    const ext      = path.extname(file);
    const baseName = path.basename(file, ext);
    const skillDir = path.join(skillsDir, baseName);
    const dest     = path.join(skillDir, 'SKILL.md');
    await fs.ensureDir(skillDir);

    const bodyContent = await readMarkdown(src);
    const description = extractH1(bodyContent) || baseName;

    const finalContent =
      buildSkillFrontmatter({ name: baseName, description }) + bodyContent;

    await fs.writeFile(dest, finalContent, 'utf-8');
    console.log(`   ${chalk.green('✔')} ${chalk.cyan(`.agent/skills/${baseName}/SKILL.md`)}`);
  }
}

async function injectCursor(
  category: CategoryEntry,
  stackName: string,
  alwaysApply: boolean
): Promise<void> {
  const destDir = path.join(process.cwd(), '.cursor', 'rules');
  await fs.ensureDir(destDir);

  const globs = globForStack(stackName);

  for (const file of category.files) {
    const src      = path.join(category.absPath, file);
    const ext      = path.extname(file);
    const baseName = path.basename(file, ext);
    const destName = baseName + '.mdc';
    const dest     = path.join(destDir, destName);

    const bodyContent = await readMarkdown(src);
    const description = extractH1(bodyContent) || baseName;

    const finalContent =
      buildMdcFrontmatter({ description, globs, alwaysApply }) + bodyContent;

    await fs.writeFile(dest, finalContent, 'utf-8');
    console.log(`   ${chalk.green('✔')} ${chalk.cyan(`.cursor/rules/${destName}`)}`);
  }
}

async function injectCopilot(
  category: CategoryEntry,
  stackName: string,
  mode: 'instructions' | 'global'
): Promise<void> {
  if (mode === 'instructions') {
    const destDir = path.join(process.cwd(), '.github', 'instructions');
    await fs.ensureDir(destDir);
    const applyTo = globForStack(stackName);

    for (const file of category.files) {
      const src      = path.join(category.absPath, file);
      const ext      = path.extname(file);
      const baseName = path.basename(file, ext);
      const destName = baseName + '.instructions.md';
      const dest     = path.join(destDir, destName);

      const bodyContent = await readMarkdown(src);
      const finalContent =
        buildCopilotFrontmatter({ applyTo }) + bodyContent;

      await fs.writeFile(dest, finalContent, 'utf-8');
      console.log(`   ${chalk.green('✔')} ${chalk.cyan(`.github/instructions/${destName}`)}`);
    }
  } else {
    const destDir = path.join(process.cwd(), '.github');
    await fs.ensureDir(destDir);
    const dest = path.join(destDir, 'copilot-instructions.md');
    const sections: string[] = [];

    for (const file of category.files) {
      const src     = path.join(category.absPath, file);
      const content = await readMarkdown(src);
      const title   = extractH1(content) || path.basename(file, '.md');
      sections.push(`# ${title}\n\n${content.trim()}`);
    }

    await fs.writeFile(dest, sections.join('\n\n---\n\n'), 'utf-8');
    console.log(`   ${chalk.green('✔')} ${chalk.cyan('.github/copilot-instructions.md')}`);
  }
}
// ─── Project Detection Helpers ──────────────────────────────────────────────

interface ProjectConfig {
  agents_registry?: string;
  stack?: string;
  version?: string;
}

async function getProjectConfig(): Promise<ProjectConfig | null> {
  const configPath = path.join(process.cwd(), '.claude', 'project.config.yml');
  if (await fs.pathExists(configPath)) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const lines = content.split('\n');
      const config: ProjectConfig = {};
      
      for (const line of lines) {
        if (line.trim().startsWith('agents_registry:')) config.agents_registry = line.split(': ')[1]?.trim();
        if (line.trim().startsWith('stack:')) config.stack = line.split(': ')[1]?.trim();
        if (line.trim().startsWith('version:')) config.version = line.split(': ')[1]?.trim();
      }
      return config;
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function detectExistingConfig() {
  const projectRoot = process.cwd();
  const detected: string[] = [];
  
  if (await fs.pathExists(path.join(projectRoot, '.claude'))) detected.push('Claude Code');
  if (await fs.pathExists(path.join(projectRoot, '.cursor', 'rules'))) detected.push('Cursor Rules');
  if (await fs.pathExists(path.join(projectRoot, '.github', 'instructions'))) detected.push('GitHub Copilot');
  if (await fs.pathExists(path.join(projectRoot, '.agent', 'skills'))) detected.push('Antigravity');
  
  return detected;
}

// ─── Inyección de Agentes / Skills ──────────────────────────────────────────

async function injectClaudeCode(agentsRegistry: string, stackName: string): Promise<void> {
  const stackPath = path.join(agentsRegistry, 'claude-code', stackName);
  const projectRoot = process.cwd();

  // 1. Copy CLAUDE.md to project root
  const claudeMdSrc = path.join(stackPath, 'CLAUDE.md');
  if (await fs.pathExists(claudeMdSrc)) {
    await fs.copy(claudeMdSrc, path.join(projectRoot, 'CLAUDE.md'));
    console.log(`   ${chalk.green('✔')} ${chalk.cyan('CLAUDE.md')} (root)`);
  }

  // 2. Create .claude/project.config.yml if not exists
  const claudeDir = path.join(projectRoot, '.claude');
  const configFile = path.join(claudeDir, 'project.config.yml');
  await fs.ensureDir(claudeDir);
  
  if (!(await fs.pathExists(configFile))) {
    const basicConfig = `project_name: ${path.basename(projectRoot)}\nstack: ${stackName}\nagents_registry: ${agentsRegistry}\nversion: 1.0.0\n# Configuración local - NO SUBIR AL REPO\n`;
    await fs.writeFile(configFile, basicConfig, 'utf-8');
    console.log(`   ${chalk.green('✔')} ${chalk.cyan('.claude/project.config.yml')}`);
  }

  // 3. Copy agents directory
  const agentsSrc = path.join(stackPath, 'agents');
  const agentsDest = path.join(claudeDir, 'agents');
  if (await fs.pathExists(agentsSrc)) {
    await fs.ensureDir(agentsDest);
    await fs.copy(agentsSrc, agentsDest);
    const files = await fs.readdir(agentsSrc);
    console.log(`   ${chalk.green('✔')} ${chalk.cyan(`.claude/agents/`)} (${files.length} agentes)`);
  }

  // 4. Update .gitignore
  const gitignorePath = path.join(projectRoot, '.gitignore');
  const gitignoreEntries = ['\n# Claude Code (local agents)', '.claude/', 'CLAUDE.md'];
  
  if (await fs.pathExists(gitignorePath)) {
    let content = await fs.readFile(gitignorePath, 'utf-8');
    let modified = false;
    for (const entry of gitignoreEntries) {
      if (!content.includes(entry.trim()) && entry.trim() !== '') {
        content += (content.endsWith('\n') ? '' : '\n') + entry;
        modified = true;
      }
    }
    if (modified) {
      await fs.writeFile(gitignorePath, content, 'utf-8');
      console.log(`   ${chalk.green('✔')} ${chalk.cyan('.gitignore')} (actualizado)`);
    }
  } else {
    await fs.writeFile(gitignorePath, gitignoreEntries.join('\n'), 'utf-8');
    console.log(`   ${chalk.green('✔')} ${chalk.cyan('.gitignore')} (creado)`);
  }
}

// ─── CLI Setup ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('ag-loader')
  .description('Carga skills y agentes de IA al proyecto actual.')
  .version('1.2.0');

// ─── Comando: list ────────────────────────────────────────────────────────────

program
  .command('list')
  .description('Muestra todos los stacks y archivos disponibles')
  .option('-e, --editor <editor>', 'Filtrar por editor: antigravity | cursor | vscode')
  .action(async (opts: { editor?: string }) => {
    const registryPath = await getActiveRegistryPath();
    const agentsPath = await getActiveAgentsPath();
    
    console.log('');
    console.log(chalk.bold('📂 Skills disponibles (Registry)'));
    console.log(chalk.dim(`   ${registryPath}`));
    console.log('');

    const editorsToDisplay = opts.editor 
      ? EDITORS.filter(e => e.key === opts.editor)
      : EDITORS;

    for (const editor of editorsToDisplay) {
      const tree = await getEditorTree(registryPath, editor.key);
      console.log(chalk.bold.magenta(`  ┌─ ${editor.label.toUpperCase()} `));
      if (tree.length === 0) console.log(chalk.dim(`  │   (sin stacks)`));
      for (const item of tree) {
        console.log(`  │  ${chalk.cyan(`[${item.stack}]`)}`);
      }
      console.log(chalk.bold.magenta(`  └${'─'.repeat(45)}`));
    }

    console.log('\n' + chalk.bold('🤖 Agentes disponibles (Claude Code)'));
    console.log(chalk.dim(`   ${agentsPath}`));
    console.log('');
    
    const agentsTree = await getAgentsTree(agentsPath);
    for (const item of agentsTree) {
      console.log(chalk.bold.yellow(`  ┌─ ${item.tool.toUpperCase()} `));
      for (const stack of item.stacks) {
        console.log(`  │  ${chalk.cyan(`[${stack}]`)}`);
      }
      console.log(chalk.bold.yellow(`  └${'─'.repeat(45)}`));
    }
    console.log('');
  });

// ─── Comando: config ──────────────────────────────────────────────────────────

const configCmd = program.command('config').description('Gestiona la configuración');

configCmd
  .command('set-path <ruta>')
  .description('Define el directorio raíz de tus skills')
  .action(async (ruta: string) => {
    const resolved = path.resolve(ruta);
    await fs.ensureDir(resolved);
    await writeConfig({ registryPath: resolved });
    console.log(chalk.green(`\n✅ Ruta de skills actualizada: ${resolved}\n`));
  });

configCmd
  .command('set-agents-path <ruta>')
  .description('Define el directorio raíz de tus agentes (Claude Code)')
  .action(async (ruta: string) => {
    const resolved = path.resolve(ruta);
    await fs.ensureDir(resolved);
    await writeConfig({ agentsPath: resolved });
    console.log(chalk.green(`\n✅ Ruta de agentes actualizada: ${resolved}\n`));
  });

configCmd
  .command('get-path')
  .action(async () => {
    const config = await readConfig();
    console.log(`\n   ${chalk.bold('Skills Path:')}  ${chalk.cyan(config.registryPath)}`);
    console.log(`   ${chalk.bold('Agents Path:')}  ${chalk.cyan(config.agentsPath)}\n`);
  });

configCmd
  .command('reset')
  .description('Restablece rutas predeterminadas')
  .action(async () => {
    await writeConfig({ registryPath: DEFAULT_REGISTRY, agentsPath: DEFAULT_AGENTS_REGISTRY });
    console.log(chalk.green('\n✅ Configuración restablecida.\n'));
  });

// ─── Comando: agents (Nuevo) ──────────────────────────────────────────────────

const agentsCmd = program.command('agents').description('Gestiona los agentes para Claude Code');

agentsCmd
  .command('set-path <ruta>')
  .description('Define el directorio de agentes')
  .action(async (ruta: string) => {
    const resolved = path.resolve(ruta);
    await fs.ensureDir(resolved);
    await writeConfig({ agentsPath: resolved });
    console.log(chalk.green(`\n✅ Ruta de agentes actualizada: ${resolved}\n`));
  });

agentsCmd
  .command('list')
  .action(async () => {
    const agentsPath = await getActiveAgentsPath();
    const tree = await getAgentsTree(agentsPath);
    console.log(`\n📂 Agentes en ${chalk.dim(agentsPath)}\n`);
    for (const tool of tree) {
      console.log(`${chalk.bold.yellow(tool.tool)}:`);
      tool.stacks.forEach(s => console.log(`  - ${s}`));
    }
    console.log('');
  });

// ─── Comando: init ────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Carga skills o agentes al proyecto (flujo interactivo)')
  .action(async () => {
    await ensureRegistryExists();
    const config = await readConfig();
    const projectConfig = await getProjectConfig();
    
    console.log('\n' + chalk.bold('  ag-loader ') + chalk.dim('— cargador de IA v1.2.0\n'));

    // ── Paso 0: Detección Automática ──────────────────────────────────────
    const existing = await detectExistingConfig();
    if (existing.length > 0) {
      console.log(`   ${chalk.blue('ℹ')} Se detectó configuración de: ${chalk.cyan(existing.join(', '))}`);
      
      const { action } = await prompts({
        type: 'select',
        name: 'action',
        message: '¿Qué quieres hacer?',
        choices: [
          { title: 'Usar existentes (no hacer nada)', value: 'keep' },
          { title: 'Re-cargar / Actualizar agentes', value: 'update' },
          { title: 'Configurar nueva herramienta',  value: 'new' },
        ]
      }, { onCancel: () => process.exit(0) });

      if (action === 'keep') {
        console.log(chalk.green('\n✅ Manteniendo configuración actual.\n'));
        return;
      }
      
      if (action === 'update' && projectConfig?.agents_registry && projectConfig?.stack) {
        console.log(`\n🔄 Actualizando agentes para ${chalk.bold(projectConfig.stack)} desde el origen conocido...`);
        await injectClaudeCode(projectConfig.agents_registry, projectConfig.stack);
        console.log(chalk.bold.green(`\n🎉 Agentes actualizados correctamente.\n`));
        return;
      }
    }

    // ── Paso 1: Confirmar Directorio de Origen ───────────────────────────
    const { sourcePath } = await prompts({
      type: 'select',
      name: 'sourcePath',
      message: '📍 ¿Desde qué directorio quieres cargar?',
      choices: [
        { 
          title: `${chalk.bold('Agentes')} (global)  ${chalk.dim(config.agentsPath)}`, 
          value: { path: config.agentsPath, type: 'agents' } 
        },
        { 
          title: `${chalk.bold('Skills')} (global)   ${chalk.dim(config.registryPath)}`, 
          value: { path: config.registryPath, type: 'skills' } 
        },
        { 
          title: `${chalk.bold('Otro')} (personalizado)...`, 
          value: 'custom' 
        },
      ]
    }, { onCancel: () => process.exit(0) });

    let activePath = '';
    let sourceType: 'agents' | 'skills' = 'agents';

    if (sourcePath === 'custom') {
      const { customPath } = await prompts({
        type: 'text',
        name: 'customPath',
        message: 'Introduce la ruta absoluta del directorio:',
        validate: async (input) => (await fs.pathExists(input)) || 'La ruta no existe'
      }, { onCancel: () => process.exit(0) });
      activePath = customPath;
      sourceType = (await fs.pathExists(path.join(activePath, 'claude-code'))) ? 'agents' : 'skills';
    } else {
      activePath = sourcePath.path;
      sourceType = sourcePath.type;
    }

    // ── Paso 2: Herramienta de IA ──────────────────────────────────────────
    
    const { tool } = await prompts({
      type: 'select',
      name: 'tool',
      message: '🖥  ¿Qué herramienta de IA de desarrollo quieres usar?',
      choices: [
        { title: `${chalk.bold('CLAUDE CODE')}     ${chalk.dim('Agentes, CLAUDE.md, .claude/')}`, value: 'claude-code', disabled: sourceType !== 'agents' && activePath === config.registryPath },
        { title: `${chalk.bold('GITHUB COPILOT')}  ${chalk.dim('Instrucciones VS Code .github/')}`, value: 'copilot', disabled: sourceType !== 'skills' && activePath === config.agentsPath },
        { title: `${chalk.bold('OTRAS (Cursor, AG)')} ${chalk.dim('Skills y reglas standard')}`,   value: 'other', disabled: sourceType !== 'skills' && activePath === config.agentsPath },
      ]
    }, { onCancel: () => process.exit(0) });

    if (tool === 'claude-code') {
      const stacks = await getAgentStacksForTool(activePath, 'claude-code');
      if (stacks.length === 0) {
        console.log(chalk.yellow('\n⚠ No se encontraron agentes para Claude Code en: ') + activePath);
        process.exit(0);
      }
      const { stack } = await prompts({
        type: 'select',
        name: 'stack',
        message: '📦 ¿Para qué tecnologia quieres cargar agentes?',
        choices: stacks.map(s => ({ title: s, value: s }))
      }, { onCancel: () => process.exit(0) });

      console.log('');
      await injectClaudeCode(activePath, stack);
      console.log(chalk.bold.green(`\n🎉 Agentes de "${stack}" cargados correctamente.\n`));

    } else if (tool === 'copilot') {
      const stacks = await getStacksForEditor(activePath, 'vscode');
      const { stack } = await prompts({
        type: 'select',
        name: 'stack',
        message: '📦 ¿Qué stack?',
        choices: stacks.map(s => ({ title: s, value: s }))
      }, { onCancel: () => process.exit(0) });
      
      const cats = await getCategoriesForStack(activePath, 'vscode', stack);
      const { mode } = await prompts({
        type: 'select',
        name: 'mode',
        message: '📁 Modo de generación:',
        choices: [
          { title: 'Por contexto (.github/instructions/)', value: 'instructions' },
          { title: 'Global (.github/copilot-instructions.md)', value: 'global' },
        ]
      }, { onCancel: () => process.exit(0) });

      for (const cat of cats) await injectCopilot(cat, stack, mode);
      console.log(chalk.bold.green('\n🎉 Instrucciones de Copilot cargadas.\n'));

    } else if (tool === 'other') {
      const { editor } = await prompts({
        type: 'select',
        name: 'editor',
        message: '🔍 Selecciona el formato de skills:',
        choices: [
          { title: 'Antigravity (.agent/skills/)', value: 'antigravity' },
          { title: 'Cursor (.cursor/rules/)',      value: 'cursor' },
        ]
      }, { onCancel: () => process.exit(0) });

      // Si es Antigravity, filtramos solo Claude y antigravity-rules
      let stacks = await getStacksForEditor(activePath, editor as EditorKey);
      if (editor === 'antigravity') {
        stacks = stacks.filter(s => s === 'claude-code' || s === 'antigravity-rules');
        if (stacks.length === 0) {
          console.log(chalk.yellow('\n⚠ No se encontraron skills compatibles con Antigravity en este directorio.'));
          process.exit(0);
        }
      }

      const { stack } = await prompts({
        type: 'select',
        name: 'stack',
        message: '📦 ¿Qué stack?',
        choices: stacks.map(s => ({ title: s, value: s }))
      }, { onCancel: () => process.exit(0) });

      const cats = await getCategoriesForStack(activePath, editor as EditorKey, stack);
      
      let alwaysApply = false;
      if (editor === 'cursor') {
        const { apply } = await prompts({
          type: 'select',
          name: 'apply',
          message: '⚙️  ¿Cuándo deben aplicarse las reglas?',
          choices: [
            { title: 'Siempre (alwaysApply: true)', value: true },
            { title: 'Por contexto (match globs)',  value: false },
          ]
        }, { onCancel: () => process.exit(0) });
        alwaysApply = apply;
      }

      for (const cat of cats) {
        if (editor === 'antigravity') await injectAntigravity(cat);
        else await injectCursor(cat, stack, alwaysApply);
      }
      console.log(chalk.bold.green('\n🎉 Skills/Reglas cargadas correctamente.\n'));
    }
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv);
