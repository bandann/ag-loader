# bandev-ag-loader

> CLI global para cargar agents y skills de IA en cualquier proyecto.  
> Compatible con **Claude Code**, **GitHub Copilot**, **Cursor** y **Antigravity**.

[![npm version](https://img.shields.io/npm/v/bandev-ag-loader.svg)](https://www.npmjs.com/package/bandev-ag-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ¿Qué hace?

`ag-loader` mantiene un repositorio global de agentes y skills de IA en tu PC y los inyecta en cualquier proyecto con el formato correcto para tu herramienta de IA:

| Herramienta        | Archivos generados en el proyecto                            |
| ------------------ | ------------------------------------------------------------ |
| **Claude Code**    | `CLAUDE.md`, `.claude/agents/`, `.claude/project.config.yml` |
| **GitHub Copilot** | `.github/instructions/` o `copilot-instructions.md`          |
| **Cursor**         | `.cursor/rules/` (`.mdc` con frontmatter auto)               |
| **Antigravity**    | `.agent/skills/` (`.md` con frontmatter)                     |

**Características clave:**

- 🔍 **Detección automática** de herramientas ya instaladas en el proyecto
- ♻️ **Re-carga con un click** desde el último origen configurado
- 🔒 **Auto-gitignore**: Los agentes se excluyen del repositorio automáticamente
- 📁 **Filtrado por editor**: Antigravity solo ve sus archivos compatibles

---

## Instalación

```bash
npm install -g bandev-ag-loader
```

Verifica la instalación:

```bash
ag-loader --version   # → 1.3.0
```

---

## Guía de integración paso a paso

### Para Claude Code

#### 1. Organiza tus agentes en el disco

Crea la siguiente estructura en cualquier directorio de tu PC (por ejemplo, `E:\mis-agentes`):

```
E:\mis-agentes\
└── claude-code\                 ← nombre de la herramienta (fijo)
    ├── shopify\                 ← nombre del stack / tecnología
    │   ├── CLAUDE.md            ← instrucciones del orquestador principal
    │   └── agents\              ← agentes especializados
    │       ├── SHOPIFY_ORCHESTRATOR.md
    │       ├── AGENT_FIGMA_PIXEL_PERFECT.md
    │       ├── AGENT_TEMPLATE_ARCHITECT.md
    │       ├── AGENT_PDP_SPECIALIST.md
    │       ├── AGENT_SECTION_BUILDER.md
    │       └── AGENT_AUDITOR_PERFORMANCE.md
    ├── reactjs\
    │   ├── CLAUDE.md
    │   └── agents\
    │       ├── AGENT_COMPONENTS.md
    │       └── AGENT_STATE_MANAGER.md
    └── nextjs\
        ├── CLAUDE.md
        └── agents\
            └── AGENT_API_ROUTES.md
```

#### 2. Apunta ag-loader a tu carpeta de agentes

```bash
ag-loader agents set-path "E:\mis-agentes"
```

#### 3. Carga los agentes en tu proyecto

Abre una terminal **dentro de la carpeta del proyecto** donde quieres cargar los agentes:

```bash
cd mi-proyecto-shopify
ag-loader init
```

#### 4. Flujo interactivo

```
ag-loader — cargador de IA v1.3.0

ℹ Se detectó configuración de: Claude Code   ← si ya tienes agentes
? ¿Qué quieres hacer?
  › Usar existentes (no hacer nada)
    Re-cargar / Actualizar agentes            ← actualiza en un click
    Configurar nueva herramienta

# Si es la primera vez:
? ¿Desde qué directorio quieres cargar?
  › Agentes (global)   E:\mis-agentes
    Skills (global)    C:\Users\tú\.ag-skills
    Otro (personalizado)...

? ¿Qué herramienta de IA de desarrollo quieres usar?
  › CLAUDE CODE     Agentes, CLAUDE.md, .claude/
    GITHUB COPILOT  Instrucciones VS Code .github/
    OTRAS (Cursor, AG)  Skills y reglas standard

? ¿Para qué tecnología quieres cargar agentes?
  › shopify
    reactjs
    nextjs
```

#### 5. Resultado en tu proyecto

```
mi-proyecto-shopify/
├── CLAUDE.md                     ← copiado desde tus agentes
├── .claude/
│   ├── project.config.yml        ← creado automáticamente
│   └── agents/
│       ├── SHOPIFY_ORCHESTRATOR.md
│       ├── AGENT_FIGMA_PIXEL_PERFECT.md
│       └── ... (todos tus agentes)
└── .gitignore                    ← actualizado: .claude/ y CLAUDE.md excluidos
```

> Los agentes son **locales al desarrollador**: `CLAUDE.md` y `.claude/` se añaden automáticamente a `.gitignore`.

---

### Para GitHub Copilot (VS Code)

#### 1. Organiza tus skills

```
~\.ag-skills\
└── vscode\
    └── shopify\
        └── rules\
            ├── liquid-best-practices.md
            └── theme-structure.md
```

#### 2. Carga en el proyecto

```bash
cd mi-proyecto
ag-loader init
# Selecciona: Skills → GITHUB COPILOT → shopify → rules
```

---

### Para Cursor

```
~\.ag-skills\
└── cursor\
    └── reactjs\
        └── rules\
            ├── components.md
            └── hooks.md
```

Las reglas se convierten automáticamente a `.mdc` con frontmatter de Cursor.

---

### Para Antigravity

> **Nota**: Antigravity filtra el directorio para mostrar solo carpetas llamadas `claude-code` o `antigravity-rules`.

```
~\.ag-skills\
└── antigravity-rules\
    └── general\
        └── rules\
            └── coding-standards.md
```

---

## Comandos de referencia

### `ag-loader init`

Flujo interactivo completo con detección automática.

```bash
ag-loader init
```

### `ag-loader list`

Lista todos los stacks disponibles en tu directorio activo.

```bash
ag-loader list
ag-loader list --editor cursor
ag-loader list --editor vscode
```

### `ag-loader agents`

Gestiona el directorio de agentes de Claude Code.

```bash
ag-loader agents set-path "E:\mis-agentes"   # cambiar la ruta
ag-loader agents list                         # listar agentes disponibles
```

### `ag-loader config`

Gestiona la configuración general del CLI.

```bash
ag-loader config set-path "C:\mis-skills"    # directorio de skills
ag-loader config set-agents-path "E:\agentes" # directorio de agentes
ag-loader config get-path                    # ver rutas activas
ag-loader config reset                       # restaurar predeterminados
```

---

## Tabla de comandos

| Comando                            | Descripción                                  |
| ---------------------------------- | -------------------------------------------- |
| `ag-loader init`                   | Flujo interactivo (detecta config existente) |
| `ag-loader list`                   | Ver stacks de skills disponibles             |
| `ag-loader list --editor <e>`      | Filtrar por editor                           |
| `ag-loader agents set-path <ruta>` | Cambiar directorio de agentes                |
| `ag-loader agents list`            | Ver agentes disponibles                      |
| `ag-loader config set-path <ruta>` | Cambiar directorio de skills                 |
| `ag-loader config get-path`        | Ver rutas activas                            |
| `ag-loader config reset`           | Restaurar predeterminados                    |
| `ag-loader --version`              | Ver versión                                  |
| `ag-loader --help`                 | Ver ayuda                                    |

---

## Directorio de configuración global

La configuración del CLI se guarda en `~/.ag-loader.json`:

```json
{
  "registryPath": "C:\\Users\\tú\\.ag-skills",
  "agentsPath": "E:\\mis-agentes"
}
```

Las rutas predeterminadas son:

- **Skills**: `~/.ag-skills/`
- **Agentes**: `~/.ag-agents/`

---

## Desarrollo local

```bash
git clone https://github.com/bandann/ag-loader.git
cd ag-loader
npm install
npm run build
npm link         # instalar globalmente para pruebas
npm run dev      # modo desarrollo con ts-node
npm test         # correr tests
```

---

## Contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-feature`
3. Haz tus cambios y corre los tests: `npm test`
4. Abre un Pull Request

---

## Licencia

MIT © [bandann](https://github.com/bandann)
