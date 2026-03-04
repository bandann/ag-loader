# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-03-04

### Added

- **Auto-detection of existing tools**: `ag-loader init` now scans the project for `.claude`, `.cursor/rules`, `.github/instructions`, and `.agent/skills` before prompting. Informs the user what's already installed.
- **Quick re-load**: If Claude Code agents were previously loaded, the "Re-cargar / Actualizar agentes" option refreshes them from the last known registry path — no re-configuration needed.
- **Editor-specific filtering**: When selecting Antigravity, only `claude-code` and `antigravity-rules` stacks are shown. VS Code sees all formats.
- **Registry path persistence**: `injectClaudeCode` now saves `agents_registry` in `.claude/project.config.yml` so future reloads are fully automatic.
- **Automatic `.gitignore` update**: When loading Claude Code agents, `.claude/` and `CLAUDE.md` are added to `.gitignore` automatically to keep agents local-only.
- **Test suite**: Added Vitest-based tests for `detectExistingConfig`, `getProjectConfig`, and the `injectClaudeCode` logic.

## [1.2.0] - 2026-03-01

### Added

- `CLAUDE CODE` option in `ag-loader init` to load Claude Code agents.
- Path confirmation step (Agents, Skills, Custom) at the start of `init`.
- `agents set-path` and `agents list` commands.
- Demo scaffold for Claude Code Shopify agents in `~/.ag-agents`.

## [1.1.0] - 2026-02-24

### Added

- Skill scoping: global per-user or local per-project.
- `config init-project` command.
- Updated `init` and `list` commands for scope support.

## [1.0.0] - 2026-02-21

### Added

- Initial release: `ag-loader init`, `ag-loader list`, and `ag-loader config` commands.
- Support for Antigravity, Cursor, and VS Code skills.
