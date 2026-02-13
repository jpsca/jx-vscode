import * as vscode from "vscode";
import * as path from "path";
import { parseImports } from "./jxParser";
import { CatalogScanner } from "./catalogScanner";

// Mirrors parser.py re_tag_name
const RX_COMPONENT_TAG = /[A-Z][0-9A-Za-z_.:$-]*/;

export class JxDefinitionProvider implements vscode.DefinitionProvider {
  constructor(private catalogScanner: CatalogScanner) {}

  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): Promise<vscode.Definition | undefined> {
    const imports = parseImports(document);

    // Case 1: Cursor on the import path string
    for (const imp of imports) {
      if (imp.pathRange.contains(position)) {
        return this.resolveImportPath(imp.path, document.uri);
      }
    }

    // Case 2: Cursor on the alias name in the import declaration
    for (const imp of imports) {
      if (imp.nameRange.contains(position)) {
        return this.resolveImportPath(imp.path, document.uri);
      }
    }

    // Case 3: Cursor on a PascalCase component tag
    const wordRange = document.getWordRangeAtPosition(
      position,
      RX_COMPONENT_TAG
    );
    if (!wordRange) {
      return undefined;
    }

    const word = document.getText(wordRange);

    // Verify it's actually a component tag (preceded by < or </)
    const lineText = document.lineAt(position.line).text;
    const beforeWord = lineText.substring(0, wordRange.start.character);
    if (!/<\/?$/.test(beforeWord)) {
      return undefined;
    }

    // Look up the component name in imports
    const imp = imports.find((i) => i.name === word);
    if (!imp) {
      return undefined;
    }

    return this.resolveImportPath(imp.path, document.uri);
  }

  private async resolveImportPath(
    importPath: string,
    currentFileUri: vscode.Uri
  ): Promise<vscode.Location | undefined> {
    // Relative path: resolve from current file's directory
    if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const currentDir = path.dirname(currentFileUri.fsPath);
      const resolved = path.resolve(currentDir, importPath);
      return this.locationIfExists(resolved);
    }

    // Prefixed path (e.g. @ui/modal.jinja): resolve from catalog folders with matching prefix
    if (importPath.startsWith("@")) {
      const slashIndex = importPath.indexOf("/");
      if (slashIndex !== -1) {
        const prefix = importPath.substring(1, slashIndex);
        const relativePath = importPath.substring(slashIndex + 1);

        // Try catalog folders with matching prefix
        for (const folder of this.catalogScanner.folders) {
          if (folder.prefix === prefix) {
            const resolved = path.join(folder.absPath, relativePath);
            const loc = await this.locationIfExists(resolved);
            if (loc) {
              return loc;
            }
          }
        }

        // Fallback: workspace search with stripped prefix
        return this.workspaceSearch(relativePath);
      }
    }

    // Absolute catalog path: try catalog folders without prefix first
    for (const folder of this.catalogScanner.folders) {
      if (!folder.prefix) {
        const resolved = path.join(folder.absPath, importPath);
        const loc = await this.locationIfExists(resolved);
        if (loc) {
          return loc;
        }
      }
    }

    // Fallback: workspace glob search
    return this.workspaceSearch(importPath);
  }

  private async locationIfExists(
    absPath: string
  ): Promise<vscode.Location | undefined> {
    const uri = vscode.Uri.file(absPath);
    try {
      await vscode.workspace.fs.stat(uri);
      return new vscode.Location(uri, new vscode.Position(0, 0));
    } catch {
      return undefined;
    }
  }

  private async workspaceSearch(
    searchPath: string
  ): Promise<vscode.Location | undefined> {
    const files = await vscode.workspace.findFiles(
      `**/${searchPath}`,
      "**/node_modules/**",
      1
    );
    if (files.length > 0) {
      return new vscode.Location(files[0], new vscode.Position(0, 0));
    }
    return undefined;
  }
}
