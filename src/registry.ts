import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { DEFAULT_REGISTRY, DEFAULT_AGENTS_REGISTRY } from './config';

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

// ─── CLAUDE CODE DEMO CONTENT ────────────────────────────────────────────────

const CLAUDE_MD_SHOPIFY = `# Shopify Project Orchestrator
Este proyecto es un tema de Shopify. Usa los agentes especializados para tareas específicas.

## Guías Generales
- Sigue la arquitectura de carpetas de Shopify
- Mantén el rendimiento en mente
- Usa Liquid siguiendo las mejores prácticas de Shopify
`;

const AGENT_SHOPIFY_ORCHESTRATOR = `# Shopify Orchestrator
Eres el agente principal para proyectos Shopify. Tu misión es coordinar el desarrollo del tema.
`;

const AGENT_FIGMA_PIXEL_PERFECT = `# Figure Pixel Perfect
Especialista en convertir diseños de Figma a Liquid/CSS con precisión de píxel.
`;

/**
 * Asegura que el registro exista con la estructura:
 * ~/.ag-skills/<editor>/<stack>/<category>/<file>.md
 * y
 * ~/.ag-agents/claude-code/<stack>/...
 */
export async function ensureRegistryExists(): Promise<void> {
  const skillsExists = await fs.pathExists(DEFAULT_REGISTRY);
  const agentsExists = await fs.pathExists(DEFAULT_AGENTS_REGISTRY);

  if (!skillsExists) {
    // Estructura de ejemplo para los tres editores
    const scaffold: Record<string, Record<string, Record<string, string>>> = {
      antigravity: { react: { skills: DEMO_SKILL,  agents: DEMO_AGENT } },
      cursor:      { react: { rules:  DEMO_RULE                       } },
      vscode:      { react: { instructions: DEMO_SKILL, rules: DEMO_RULE } },
    };

    for (const [editor, stacks] of Object.entries(scaffold)) {
      for (const [stack, categories] of Object.entries(stacks)) {
        for (const [category, content] of Object.entries(categories)) {
          const dirPath = path.join(DEFAULT_REGISTRY, editor, stack, category);
          await fs.ensureDir(dirPath);

          const fileName = category === 'skills'
            ? 'senior-developer.md'
            : category === 'agents'
            ? 'code-reviewer.md'
            : category === 'instructions'
            ? 'senior-developer.md'
            : 'best-practices.md';

          await fs.writeFile(path.join(dirPath, fileName), content, 'utf-8');
        }
      }
    }
  }

  if (!agentsExists) {
    // Estructura de ejemplo para Claude Code (Shopify)
    const claudeShopifyDir = path.join(DEFAULT_AGENTS_REGISTRY, 'claude-code', 'shopify');
    const agentsDir = path.join(claudeShopifyDir, 'agents');
    
    await fs.ensureDir(agentsDir);
    
    await fs.writeFile(path.join(claudeShopifyDir, 'CLAUDE.md'), CLAUDE_MD_SHOPIFY, 'utf-8');
    
    const shopifyAgents = {
      'SHOPIFY_ORCHESTRATOR.md': AGENT_SHOPIFY_ORCHESTRATOR,
      'AGENT_FIGMA_PIXEL_PERFECT.md': AGENT_FIGMA_PIXEL_PERFECT,
      'AGENT_TEMPLATE_ARCHITECT.md': '# Template Architect\nEspecialista en estructura de archivos .json y .liquid templates.',
      'AGENT_PDP_SPECIALIST.md': '# PDP Specialist\nEspecialista en Product Display Pages y lógica de variantes.',
      'AGENT_SECTION_BUILDER.md': '# Section Builder\nCreador de secciones dinámicas con schema robusto.',
      'AGENT_COLLECTION_PAGE.md': '# Collection Page Agent\nEspecialista en filtrado y grillas de colecciones.',
      'AGENT_LAYOUT_SNIPPET.md': '# Layout & Snippeteer\nOptimización de layout.liquid y snippets reutilizables.',
      'AGENT_METAFIELD_ARCHITECT.md': '# Metafield Architect\nGestión de Metafields y Metaobjects vía Liquid.',
      'AGENT_AUDITOR_PERFORMANCE.md': '# Performance Auditor\nOptimización de carga y Lighthouse para Shopify themes.'
    };

    for (const [fileName, content] of Object.entries(shopifyAgents)) {
      await fs.writeFile(path.join(agentsDir, fileName), content, 'utf-8');
    }
    
    // Demo React para Claude Code
    const reactAgentsDir = path.join(DEFAULT_AGENTS_REGISTRY, 'claude-code', 'reactjs', 'agents');
    await fs.ensureDir(reactAgentsDir);
    await fs.writeFile(path.join(DEFAULT_AGENTS_REGISTRY, 'claude-code', 'reactjs', 'CLAUDE.md'), '# React Project\nInstrucciones para proyectos React.', 'utf-8');
    await fs.writeFile(path.join(reactAgentsDir, 'REACT_ARCHITECT.md'), '# React Architect\nEspecialista en hooks y hooks.', 'utf-8');
  }
}
