# Jx VSCode extension

Language support for a [Jx](https://jx.scaletti.dev/) (Jinja2-based component library).

![Demo](https://raw.githubusercontent.com/jpsca/jx-vscode/main/demo.png)

## Features

### Syntax Highlighting

- Jx-specific constructs: `import`, `def`, `css`, `js` declarations
- Jinja2 template syntax: `{{ expressions }}`, `{% statements %}`, `{# comments #}`
- PascalCase component tags (e.g., `<MyComponent>`)
- Standard HTML fallback

### Go-to-Definition                 

- `Ctrl+Click` on import paths to jump to the component file
- `Ctrl+Click` on component tags to navigate to their definition
- Supports relative, prefixed (`@prefix/...`), and absolute path resolution

### Diagnostics / Error Checking

- Runs the Jx checker (`jx check`) on save and open
- Displays inline errors with line numbers and "did you mean...?" suggestions

### Language Configuration

- Block comments (`{# ... #}`)
- Bracket matching and auto-closing for Jinja delimiters and HTML brackets
- Code folding for `block`, `if`, `for`, `macro`, `slot`, `fill`, etc.
- Smart indentation (increase after block starts, decrease before end* tags)

### Configuration Settings

- `jx.check.enabled` — toggle diagnostics on/off (default: true)
- `jx.pythonPath` — custom Python interpreter path (auto-detects if empty)

### Activation

- Activates when a `.jinja` file is opened

## Installation

Launch VS Code Quick Open (Ctrl+P), paste the following command, and press ENTER.

```bash
ext install jpscaletti.jinja-jx
```
