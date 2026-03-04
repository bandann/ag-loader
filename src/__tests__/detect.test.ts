import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// We test the core detection logic by simulating the file system
// Since detectExistingConfig and getProjectConfig are defined in index.ts
// (not exported), we replicate the logic here and test it directly.

async function detectExistingConfig(projectRoot: string) {
  const detected: string[] = [];
  if (await fs.pathExists(path.join(projectRoot, '.claude'))) detected.push('Claude Code');
  if (await fs.pathExists(path.join(projectRoot, '.cursor', 'rules'))) detected.push('Cursor Rules');
  if (await fs.pathExists(path.join(projectRoot, '.github', 'instructions'))) detected.push('GitHub Copilot');
  if (await fs.pathExists(path.join(projectRoot, '.agent', 'skills'))) detected.push('Antigravity');
  return detected;
}

interface ProjectConfig {
  agents_registry?: string;
  stack?: string;
  version?: string;
}

async function getProjectConfig(projectRoot: string): Promise<ProjectConfig | null> {
  const configPath = path.join(projectRoot, '.claude', 'project.config.yml');
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

describe('detectExistingConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ag-loader-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns empty array for a clean project', async () => {
    const result = await detectExistingConfig(tmpDir);
    expect(result).toEqual([]);
  });

  it('detects Claude Code when .claude/ exists', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    const result = await detectExistingConfig(tmpDir);
    expect(result).toContain('Claude Code');
  });

  it('detects Cursor Rules when .cursor/rules/ exists', async () => {
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
    const result = await detectExistingConfig(tmpDir);
    expect(result).toContain('Cursor Rules');
  });

  it('detects GitHub Copilot when .github/instructions/ exists', async () => {
    await fs.ensureDir(path.join(tmpDir, '.github', 'instructions'));
    const result = await detectExistingConfig(tmpDir);
    expect(result).toContain('GitHub Copilot');
  });

  it('detects Antigravity when .agent/skills/ exists', async () => {
    await fs.ensureDir(path.join(tmpDir, '.agent', 'skills'));
    const result = await detectExistingConfig(tmpDir);
    expect(result).toContain('Antigravity');
  });

  it('detects multiple tools at the same time', async () => {
    await fs.ensureDir(path.join(tmpDir, '.claude'));
    await fs.ensureDir(path.join(tmpDir, '.cursor', 'rules'));
    const result = await detectExistingConfig(tmpDir);
    expect(result).toContain('Claude Code');
    expect(result).toContain('Cursor Rules');
    expect(result).toHaveLength(2);
  });
});

describe('getProjectConfig', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ag-loader-config-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('returns null when no .claude/project.config.yml exists', async () => {
    const result = await getProjectConfig(tmpDir);
    expect(result).toBeNull();
  });

  it('parses stack and agents_registry from project.config.yml', async () => {
    const claudeDir = path.join(tmpDir, '.claude');
    await fs.ensureDir(claudeDir);
    await fs.writeFile(
      path.join(claudeDir, 'project.config.yml'),
      'project_name: mi-proyecto\nstack: shopify\nagents_registry: E:\\my-agents\nversion: 1.0.0\n',
      'utf-8'
    );

    const result = await getProjectConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.stack).toBe('shopify');
    expect(result?.agents_registry).toBe('E:\\my-agents');
    expect(result?.version).toBe('1.0.0');
  });

  it('returns empty config object when file exists but has no relevant keys', async () => {
    const claudeDir = path.join(tmpDir, '.claude');
    await fs.ensureDir(claudeDir);
    await fs.writeFile(
      path.join(claudeDir, 'project.config.yml'),
      'project_name: mi-proyecto\n',
      'utf-8'
    );

    const result = await getProjectConfig(tmpDir);
    expect(result).not.toBeNull();
    expect(result?.stack).toBeUndefined();
    expect(result?.agents_registry).toBeUndefined();
  });
});
