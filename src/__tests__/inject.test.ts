import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// Test the injectClaudeCode logic inline using a temporary directory.
// We replicate the core file-copy behavior to test it independently.

async function simulateInjectClaudeCode(agentsRegistry: string, stackName: string, projectRoot: string) {
  const stackPath = path.join(agentsRegistry, 'claude-code', stackName);

  // 1. Copy CLAUDE.md to project root
  const claudeMdSrc = path.join(stackPath, 'CLAUDE.md');
  if (await fs.pathExists(claudeMdSrc)) {
    await fs.copy(claudeMdSrc, path.join(projectRoot, 'CLAUDE.md'));
  }

  // 2. Create .claude/project.config.yml
  const claudeDir = path.join(projectRoot, '.claude');
  const configFile = path.join(claudeDir, 'project.config.yml');
  await fs.ensureDir(claudeDir);
  if (!(await fs.pathExists(configFile))) {
    const basicConfig = `project_name: ${path.basename(projectRoot)}\nstack: ${stackName}\nagents_registry: ${agentsRegistry}\nversion: 1.0.0\n`;
    await fs.writeFile(configFile, basicConfig, 'utf-8');
  }

  // 3. Copy agents directory
  const agentsSrc = path.join(stackPath, 'agents');
  const agentsDest = path.join(claudeDir, 'agents');
  if (await fs.pathExists(agentsSrc)) {
    await fs.ensureDir(agentsDest);
    await fs.copy(agentsSrc, agentsDest);
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
    if (modified) await fs.writeFile(gitignorePath, content, 'utf-8');
  } else {
    await fs.writeFile(gitignorePath, gitignoreEntries.join('\n'), 'utf-8');
  }
}

describe('injectClaudeCode simulation', () => {
  let projectRoot: string;
  let agentsRegistry: string;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ag-project-'));
    agentsRegistry = await fs.mkdtemp(path.join(os.tmpdir(), 'ag-registry-'));

    // Scaffold demo registry
    const stackPath = path.join(agentsRegistry, 'claude-code', 'shopify');
    await fs.ensureDir(path.join(stackPath, 'agents'));
    await fs.writeFile(path.join(stackPath, 'CLAUDE.md'), '# Shopify Agent\n\nYou are a Shopify expert.', 'utf-8');
    await fs.writeFile(path.join(stackPath, 'agents', 'AGENT_TEST.md'), '# Test Agent\n', 'utf-8');
    await fs.writeFile(path.join(stackPath, 'agents', 'AGENT_PDP.md'), '# PDP Agent\n', 'utf-8');
  });

  afterEach(async () => {
    await fs.remove(projectRoot);
    await fs.remove(agentsRegistry);
  });

  it('copies CLAUDE.md to project root', async () => {
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    const exists = await fs.pathExists(path.join(projectRoot, 'CLAUDE.md'));
    expect(exists).toBe(true);
  });

  it('creates .claude/agents directory with agent files', async () => {
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    const agentExists = await fs.pathExists(path.join(projectRoot, '.claude', 'agents', 'AGENT_TEST.md'));
    expect(agentExists).toBe(true);
  });

  it('creates .claude/project.config.yml with registry path', async () => {
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    const configPath = path.join(projectRoot, '.claude', 'project.config.yml');
    expect(await fs.pathExists(configPath)).toBe(true);
    const content = await fs.readFile(configPath, 'utf-8');
    expect(content).toContain('stack: shopify');
    expect(content).toContain(`agents_registry: ${agentsRegistry}`);
  });

  it('creates .gitignore excluding .claude/ and CLAUDE.md', async () => {
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const content = await fs.readFile(gitignorePath, 'utf-8');
    expect(content).toContain('.claude/');
    expect(content).toContain('CLAUDE.md');
  });

  it('updates existing .gitignore without duplicating entries', async () => {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    await fs.writeFile(gitignorePath, 'node_modules/\n.env\n', 'utf-8');

    // Run injection twice
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);

    const content = await fs.readFile(gitignorePath, 'utf-8');
    // Count occurrences of .claude/ — should only appear once
    const matches = content.match(/\.claude\//g);
    expect(matches).toHaveLength(1);
  });

  it('copies all agent files from stack', async () => {
    await simulateInjectClaudeCode(agentsRegistry, 'shopify', projectRoot);
    const files = await fs.readdir(path.join(projectRoot, '.claude', 'agents'));
    expect(files).toContain('AGENT_TEST.md');
    expect(files).toContain('AGENT_PDP.md');
    expect(files).toHaveLength(2);
  });
});
