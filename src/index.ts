#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import prompts from 'prompts';
import { ensureRegistryExists, getRegistryPath } from './registry';
import {
  readConfig,
  writeConfig,
  getActiveRegistryPath,
  getStacksForEditor,
  getCategoriesForStack,
  getEditorTree,
  DEFAULT_REGISTRY,
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

// ─── Injection: Antigravity (.agent/skills/<name>/SKILL.md) ──────────────────
// Antigravity skills require: .agent/skills/<skill-name>/SKILL.md
// Each SKILL.md has YAML frontmatter with name + description.

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

  console.log('');
  console.log(
    chalk.bold.green(`✅ ${category.files.length} skill(s) → `) +
    chalk.white('.agent/skills/') +
    chalk.dim('  (Antigravity cargará estos skills automáticamente)')
  );
}

// ─── Injection: Cursor (.cursor/rules/*.mdc) ─────────────────────────────────
// Cursor lee TODAS las reglas en .cursor/rules/*.mdc.
// Cada archivo necesita frontmatter válido con description + globs + alwaysApply.

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
    const ext      = path.extname(file);                     // .md or .mdc
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

  console.log('');
  console.log(
    chalk.bold.green(`✅ ${category.files.length} regla(s) → `) +
    chalk.white('.cursor/rules/') +
    chalk.dim(`  (globs: ${globs}, alwaysApply: ${alwaysApply})`)
  );
}

// ─── Injection: VS Code / Copilot (.github/instructions/) ────────────────────
// GitHub Copilot soporta:
//   - .github/instructions/*.instructions.md  (por contexto, con applyTo)
//   - .github/copilot-instructions.md          (repo-wide, todo consolidado)

async function injectCopilot(
  category: CategoryEntry,
  stackName: string,
  mode: 'instructions' | 'global'
): Promise<void> {
  if (mode === 'instructions') {
    // Modo instrucciones por contexto
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

    console.log('');
    console.log(
      chalk.bold.green(`✅ ${category.files.length} instrucción(es) → `) +
      chalk.white('.github/instructions/') +
      chalk.dim(`  (applyTo: ${applyTo})`)
    );
  } else {
    // Modo global: todo consolidado en un único archivo
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
    console.log(`   ${chalk.green('✔')} ${chalk.cyan('.github/copilot-instructions.md')} (${category.files.length} skill(s) consolidados)`);
    console.log('');
    console.log(chalk.bold.green(`✅ Consolidado en `) + chalk.white('.github/copilot-instructions.md'));
  }
}

// ─── CLI Setup ────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('ag-loader')
  .description('Carga skills de IA al proyecto actual. Compatible con Antigravity, Cursor y VS Code.')
  .version('1.0.0');

// ─── Comando: list ────────────────────────────────────────────────────────────

program
  .command('list')
  .description('Muestra todos los stacks y archivos disponibles por editor')
  .option('-e, --editor <editor>', 'Filtrar: antigravity | cursor | vscode')
  .action(async (opts: { editor?: string }) => {
    const registryPath = await getActiveRegistryPath();
    const editorsToShow = opts.editor
      ? EDITORS.filter((e) => e.key === opts.editor)
      : EDITORS;

    console.log('');
    console.log(chalk.bold('📂 Skills disponibles'));
    console.log(chalk.dim(`   ${registryPath}`));
    console.log('');

    for (const editor of editorsToShow) {
      const tree = await getEditorTree(registryPath, editor.key);
      const totalStacks = tree.length;

      console.log(chalk.bold.magenta(`  ┌─ ${editor.label.toUpperCase()} `) + chalk.dim(`(${totalStacks} stack(s))`));

      if (tree.length === 0) {
        console.log(chalk.dim(`  │   (sin stacks — añade carpetas en ${path.join(registryPath, editor.key)})`));
      }

      for (const { stack, categories } of tree) {
        const total = categories.reduce((a, c) => a + c.files.length, 0);
        console.log(`  │  ${chalk.bold.cyan(`[${stack}]`)} ${chalk.dim(`${total} archivo(s)`)}`);

        for (const cat of categories) {
          if (cat.name === '__root__') {
            for (const f of cat.files) console.log(`  │     ${chalk.dim('•')} ${f}`);
          } else {
            console.log(`  │     ${chalk.yellow('▸')} ${chalk.bold(cat.name)} ${chalk.dim(`(${cat.files.length})`)}`);
            for (const f of cat.files) console.log(`  │        ${chalk.dim('•')} ${f}`);
          }
        }
      }

      console.log(chalk.bold.magenta(`  └${'─'.repeat(45)}`));
      console.log('');
    }
  });

// ─── Comando: config ──────────────────────────────────────────────────────────

const configCmd = program.command('config').description('Gestiona la configuración de ag-loader');

configCmd
  .command('set-path <ruta>')
  .description('Define el directorio raíz de tus skills')
  .action(async (ruta: string) => {
    const resolved = path.resolve(ruta);
    if (!(await fs.pathExists(resolved))) {
      console.log(chalk.yellow(`\n⚠  La ruta no existe: ${resolved}\n`));
      process.exit(1);
    }
    await writeConfig({ registryPath: resolved });
    console.log(chalk.bold.green(`\n✅ Ruta actualizada → ${chalk.cyan(resolved)}\n`));
    console.log(chalk.dim('   Ejecuta "ag-loader list" para verificar tu estructura.\n'));
  });

configCmd
  .command('get-path')
  .description('Muestra el directorio activo')
  .action(async () => {
    const config = await readConfig();
    console.log(`\n   ${chalk.bold('Directorio activo:')} ${chalk.cyan(config.registryPath)}\n`);
  });

configCmd
  .command('reset')
  .description('Restablece al directorio predeterminado (~/.ag-skills/)')
  .action(async () => {
    await writeConfig({ registryPath: DEFAULT_REGISTRY });
    console.log(chalk.bold.green(`\n✅ Restablecido → ${chalk.cyan(DEFAULT_REGISTRY)}\n`));
  });

// ─── Comando: init ────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Carga skills al proyecto actual (flujo interactivo)')
  .action(async () => {
    await ensureRegistryExists();

    const registryPath = await getActiveRegistryPath();

    console.log('');
    console.log(chalk.bold('  ag-loader ') + chalk.dim('— cargador de skills de IA'));
    console.log('');

    // ── Paso 1: Editor ─────────────────────────────────────────────────────

    const { editor } = await prompts(
      {
        type: 'select',
        name: 'editor',
        message: '🖥  ¿Con qué herramienta de IA trabajas?',
        choices: EDITORS.map((e) => ({
          title: `${chalk.bold(e.label.padEnd(16))} ${chalk.dim(e.hint)}`,
          value: e.key,
        })),
      },
      { onCancel: () => process.exit(0) }
    );
    const selectedEditor = editor as EditorKey;

    // ── Paso 2: Stack ──────────────────────────────────────────────────────

    const stacks = await getStacksForEditor(registryPath, selectedEditor);

    if (stacks.length === 0) {
      console.log('');
      console.log(chalk.yellow(`⚠  No hay stacks para "${selectedEditor}".`));
      console.log(chalk.dim(`   Añade carpetas en: ${path.join(registryPath, selectedEditor)}`));
      console.log('');
      process.exit(0);
    }

    const { stack } = await prompts(
      {
        type: 'select',
        name: 'stack',
        message: '📦 ¿Qué stack/tecnología?',
        choices: stacks.map((s) => ({ title: s, value: s })),
      },
      { onCancel: () => process.exit(0) }
    );
    const selectedStack = stack as string;

    // ── Paso 3: Categoría ──────────────────────────────────────────────────

    const categories = await getCategoriesForStack(registryPath, selectedEditor, selectedStack);
    const ALL_KEY    = '__all__';
    let selectedCategories: CategoryEntry[] = [];

    if (categories.length === 1 && categories[0].name === '__root__') {
      selectedCategories = [categories[0]];
    } else {
      const { category } = await prompts(
        {
          type: 'select',
          name: 'category',
          message: `🗂  ¿Qué categoría de "${selectedStack}"?`,
          choices: [
            {
              title: `${chalk.bold('✦ Todo el stack')}  ${chalk.dim('carga todas las categorías')}`,
              value: ALL_KEY,
            },
            ...categories.map((c) => ({
              title: `${chalk.bold(c.name.padEnd(16))} ${chalk.dim(`${c.files.length} archivo(s)`)}`,
              value: c.name,
            })),
          ],
        },
        { onCancel: () => process.exit(0) }
      );

      selectedCategories =
        category === ALL_KEY
          ? categories
          : [categories.find((c) => c.name === category)!];
    }

    // ── Paso 4: Opciones específicas por editor ────────────────────────────

    let alwaysApply = false;
    let copilotMode: 'instructions' | 'global' = 'instructions';

    if (selectedEditor === 'cursor') {
      const { apply } = await prompts(
        {
          type: 'select',
          name: 'apply',
          message: '⚙️  ¿Cuándo deben aplicarse las reglas?',
          choices: [
            {
              title: `Siempre (alwaysApply: true)   ${chalk.dim('se activan en todos los archivos')}`,
              value: true,
            },
            {
              title: `Por contexto (alwaysApply: false) ${chalk.dim('solo cuando hacen match los globs')}`,
              value: false,
            },
          ],
        },
        { onCancel: () => process.exit(0) }
      );
      alwaysApply = apply as boolean;
    }

    if (selectedEditor === 'vscode') {
      const { mode } = await prompts(
        {
          type: 'select',
          name: 'mode',
          message: '📁 ¿Cómo quieres generar las instrucciones para Copilot?',
          choices: [
            {
              title: `Por contexto (.github/instructions/)  ${chalk.dim('un .instructions.md por skill con applyTo')}`,
              value: 'instructions',
            },
            {
              title: `Global (.github/copilot-instructions.md) ${chalk.dim('todo consolidado en un solo archivo')}`,
              value: 'global',
            },
          ],
        },
        { onCancel: () => process.exit(0) }
      );
      copilotMode = mode as 'instructions' | 'global';
    }

    // ── Paso 5: Inyección ──────────────────────────────────────────────────

    console.log('');

    for (const cat of selectedCategories) {
      if (cat.files.length === 0) {
        console.log(chalk.dim(`  Saltando "${cat.name}" — sin archivos .md`));
        continue;
      }

      if (selectedCategories.length > 1) {
        console.log(chalk.dim(`  → cargando categoría: ${chalk.bold(cat.name)}`));
      }

      switch (selectedEditor) {
        case 'antigravity':
          await injectAntigravity(cat);
          break;
        case 'cursor':
          await injectCursor(cat, selectedStack, alwaysApply);
          break;
        case 'vscode':
          await injectCopilot(cat, selectedStack, copilotMode);
          break;
      }
    }

    if (selectedCategories.length > 1) {
      const total = selectedCategories.reduce((a, c) => a + c.files.length, 0);
      console.log('');
      console.log(chalk.bold.green(`🎉 Stack completo "${selectedStack}" cargado — ${total} archivo(s) en total`));
    }

    console.log('');
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv);
