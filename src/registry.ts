import fs from 'fs-extra';
import path from 'path';
import os from 'os';

const REGISTRY_ROOT = path.join(os.homedir(), '.ag-skills');

const DEMO_SKILL = `# Senior Developer

Eres un desarrollador senior experto. Escribe código limpio, mantenible y bien documentado.

## Responsabilidades
- Revisar y escribir código de alta calidad
- Seguir principios SOLID y buenas prácticas
- Documentar decisiones de arquitectura

## Restricciones
- No uses any en TypeScript
- Siempre escribe tests para lógica crítica
`;

const DEMO_AGENT = `# Code Reviewer

Actúa como un revisor de código meticuloso. Analiza el código antes de aprobarlo.

## Proceso
1. Verifica la correctitud lógica
2. Detecta posibles bugs o edge cases
3. Sugiere mejoras de legibilidad
4. Confirma que existen tests adecuados
`;

const DEMO_RULE = `# Best Practices

## Nombrado
- Variables en camelCase
- Componentes en PascalCase
- Constantes en UPPER_SNAKE_CASE

## Git
- Commits en inglés siguiendo Conventional Commits
- PRs pequeños y enfocados en un solo cambio
`;

/** Devuelve la ruta raíz del registro global. */
export function getRegistryPath(): string {
  return REGISTRY_ROOT;
}

/**
 * Asegura que el registro exista con la estructura:
 * ~/.ag-skills/<editor>/<stack>/<category>/<file>.md
 *
 * Crea un stack de ejemplo para cada editor si el directorio no existía.
 */
export async function ensureRegistryExists(): Promise<void> {
  const exists = await fs.pathExists(REGISTRY_ROOT);
  if (exists) return;

  // Estructura de ejemplo para los tres editores
  const scaffold: Record<string, Record<string, Record<string, string>>> = {
    antigravity: { react: { skills: DEMO_SKILL,  agents: DEMO_AGENT } },
    cursor:      { react: { rules:  DEMO_RULE                       } },
    vscode:      { react: { instructions: DEMO_SKILL, rules: DEMO_RULE } },
  };

  for (const [editor, stacks] of Object.entries(scaffold)) {
    for (const [stack, categories] of Object.entries(stacks)) {
      for (const [category, content] of Object.entries(categories)) {
        const dirPath = path.join(REGISTRY_ROOT, editor, stack, category);
        await fs.ensureDir(dirPath);

        const fileName = category === 'skills'
          ? 'senior-developer.md'
          : category === 'agents'
          ? 'code-reviewer.md'
          : 'best-practices.md';

        await fs.writeFile(path.join(dirPath, fileName), content, 'utf-8');
      }
    }
  }
}
