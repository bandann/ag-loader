# bandev-ag-loader

> CLI global para cargar skills, agents y rules de IA a cualquier proyecto, adaptado para Antigravity, Cursor y VS Code.

[![npm version](https://img.shields.io/npm/v/bandev-ag-loader.svg)](https://www.npmjs.com/package/bandev-ag-loader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## ¿Qué hace?

`ag-loader` lee un directorio global de skills (`~/.ag-skills/`) y los inyecta en cualquier proyecto con el formato correcto para el editor que uses:

| Editor          | Destino en el proyecto | Formato                            |
| --------------- | ---------------------- | ---------------------------------- |
| **Antigravity** | `.agents/`             | `.md`                              |
| **Cursor**      | `.cursor/rules/`       | `.mdc` + frontmatter auto-generado |
| **VS Code**     | `.clinerules/`         | `.md` individual o concatenado     |

---

## Instalación

```bash
npm install -g bandev-ag-loader
```

---

## Estructura del directorio de skills

Organiza tus skills bajo `~/.ag-skills/` con la siguiente estructura:

```
~/.ag-skills/
├── antigravity/          ← editor
│   ├── react/            ← stack (tecnología)
│   │   ├── skills/       ← categoría
│   │   │   └── senior-developer.md
│   │   └── agents/
│   │       └── code-reviewer.md
│   └── shopify/
│       └── rules/
│           └── liquid-best-practices.md
├── cursor/
│   └── react/
│       └── rules/
│           └── best-practices.md
└── vscode/
    └── react/
        └── agents/
            └── architect.md
```

> **Primera ejecución**: si `~/.ag-skills/` no existe, `ag-loader` lo crea automáticamente con ejemplos de referencia para los tres editores.

---

## Uso

### `ag-loader init`

Flujo interactivo completo: Editor → Stack → Categoría → Inyección.

```bash
ag-loader init
```

```
🖥  ¿Con qué editor estás trabajando?
  › Antigravity    Crea agents/ con archivos .md
    Cursor         Crea .cursor/rules/ con archivos .mdc
    VS Code        Genera un único .clinerules

📦 ¿Qué stack?
  › react
    shopify

🗂  ¿Qué categoría de "react"?
  › ✦ Cargar todo el stack  (todas las categorías)
    agents         3 archivo(s)
    skills         2 archivo(s)
    rules          1 archivo(s)
```

- Selecciona una **categoría** para cargar solo esos archivos.
- Selecciona **"✦ Cargar todo el stack"** para inyectar todas las categorías de una vez.

---

### `ag-loader list`

Muestra todos los stacks y archivos disponibles en tu directorio, agrupados por editor.

```bash
ag-loader list

# Filtrar por editor específico
ag-loader list --editor cursor
ag-loader list --editor antigravity
ag-loader list --editor vscode
```

Salida de ejemplo:

```
📂 Skills disponibles
   C:\Users\tu-usuario\.ag-skills

  ┌─ ANTIGRAVITY
  │  [react]  5 archivo(s)
  │     ▸ skills  (3)
  │        • senior-developer.md
  │        • junior-developer.md
  │     ▸ agents  (2)
  │        • code-reviewer.md
  └────────────────────────────────────────
```

---

### `ag-loader config`

Gestiona la configuración del CLI.

```bash
# Apuntar a una carpeta personalizada en tu PC
ag-loader config set-path "C:\MiCarpeta\Skills"
ag-loader config set-path "/home/user/mis-skills"

# Ver la ruta activa
ag-loader config get-path

# Restaurar al directorio predeterminado (~/.ag-skills/)
ag-loader config reset
```

La configuración se guarda en `~/.ag-loader.json`.

---

## Comandos de referencia

| Comando                            | Descripción                          |
| ---------------------------------- | ------------------------------------ |
| `ag-loader init`                   | Flujo interactivo para cargar skills |
| `ag-loader list`                   | Ver todos los stacks disponibles     |
| `ag-loader list --editor <editor>` | Filtrar por editor                   |
| `ag-loader config set-path <ruta>` | Cambiar directorio de skills         |
| `ag-loader config get-path`        | Ver directorio activo                |
| `ag-loader config reset`           | Restaurar directorio predeterminado  |
| `ag-loader --version`              | Ver versión                          |
| `ag-loader --help`                 | Ver ayuda general                    |

---

## Desarrollo local

```bash
# Clonar el repositorio
git clone https://github.com/bandann/ag-loader.git
cd ag-loader

# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Enlazar globalmente para pruebas
npm link

# Desarrollo con hot-reload
npm run dev
```

---

## Contribuir

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/mi-feature`
3. Realiza tus cambios y compila: `npm run build`
4. Abre un Pull Request

---

## Licencia

MIT © [bandann](https://github.com/bandann)
