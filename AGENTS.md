# AGENTS.md

This file provides guidance for AI coding agents to be productive in the Phone Management Application codebase.

## Codebase Overview

- **Backend**: Django REST Framework (DRF) located in `backend/`.
- **Frontend**: React + Vite located in `frontend-vite/`.
- **Desktop**: Electron wrapper for the full application.

## Key Instructions for Agents

1.  **Read Documentation First**: Always refer to [CLAUDE.md](CLAUDE.md) for core commands and high-level architecture.
2.  **Modular Backend**: Business logic is in `backend/apps/`. Keep logic within the appropriate domain app.
3.  **Frontend State**: Use React Context for global state (Auth, UI) and `react-query` for data synchronization.
4.  **API Communication**: Use the centralized Axios instance in [frontend-vite/src/services/api.jsx](frontend-vite/src/services/api.jsx).
5.  **Validation**: Reuse shared validators in [backend/apps/core/validators.py](backend/apps/core/validators.py).

## Common Tasks

### Backend (Django)
- **Install**: `pip install -r backend/requirements.txt`
- **Migrations**: `python backend/manage.py makemigrations` and `migrate`
- **Run**: `python backend/manage.py runserver`
- **Test**: `pytest`

### Frontend (React/Vite)
- **Install**: `npm install` (inside `frontend-vite/`)
- **Dev**: `npm run dev`
- **Electron**: `npm run electron:dev`

## Architecture & Patterns

- **Sync Logic**: Cloud synchronization is managed in `backend/apps/core/sync_manager.py`.
- **Legacy Support**: Be aware of legacy compatibility logic in `sales` and `returns` models.
- **Styling**: Tailwind CSS is used throughout the frontend.
- **Database**: Defaults to SQLite for local development and Electron packaging.

## Critical Files

- [backend/config/settings.py](backend/config/settings.py): Main backend configuration.
- [frontend-vite/src/App.jsx](frontend-vite/src/App.jsx): Frontend routing and provider setup.
- [backend/apps/sales/models.py](backend/apps/sales/models.py): Example of complex business logic.

## Repository Overview

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `/skills` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

### Intent → Skill Mapping

The agent should automatically map user intent to skills:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`

### Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/spec` or `/plan`.

Instead, the agent must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I’ll gather context first"

Correct behavior:

- Always check for and use skills first

This ensures OpenCode behaves similarly to Claude Code with full workflow enforcement.

## Orchestration: Personas, Skills, and Commands

This repo has three composable layers. They have different jobs and should not be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*. Mandatory hops when an intent matches.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/*.md`) — user-facing entry points. The *when*. The orchestration layer.

Composition rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas.** A persona may invoke skills.

The only multi-persona orchestration pattern this repo endorses is **parallel fan-out with a merge step** — used by `/ship` to run `code-reviewer`, `security-auditor`, and `test-engineer` concurrently and synthesize their reports. Do not build a "router" persona that decides which other persona to call; that's the job of slash commands and intent mapping.

See [docs/agents.md](docs/agents.md) for the decision matrix and [references/orchestration-patterns.md](references/orchestration-patterns.md) for the full pattern catalog.

**Claude Code interop:** the personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory) and as Agent Teams teammates (referenced by name when spawning). Two platform constraints align with our rules: subagents cannot spawn other subagents, and teams cannot nest. Plugin agents silently ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields.

## Creating a New Skill

> **Before you start:** run the pre-flight checks in [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill), search the catalog, check open PRs (`gh pr list --state open`), confirm the idea fits [docs/skill-anatomy.md](docs/skill-anatomy.md), and justify the gap in your PR description. Most new-skill ideas overlap an existing skill or an open PR; prefer extending an existing skill over adding a near-duplicate. CONTRIBUTING.md is the single source of truth for this workflow.

Skills in this repo are markdown-first: each lives at `skills/<kebab-case-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and follows the section anatomy (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification). Add a `scripts/` directory only when the skill ships runnable helpers; most skills are markdown only, and there are no per-skill zip packages.

For the full format, naming conventions, frontmatter rules, supporting-file thresholds, and writing principles, see [docs/skill-anatomy.md](docs/skill-anatomy.md), the single source of truth for skill structure. Do not restate that guidance here, link to it.
