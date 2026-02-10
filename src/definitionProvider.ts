import * as vscode from "vscode";
import * as path from "path";
import { parseImports, JxImport } from "./jxParser";

// Mirrors parser.py re_tag_name
const RX_COMPONENT_TAG = /[A-Z][0-9A-Za-z_.:$-]*/;

export class JxDefinitionProvider implements vscode.DefinitionProvider {
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
      const uri = vscode.Uri.file(resolved);
      try {
        await vscode.workspace.fs.stat(uri);
        return new vscode.Location(uri, new vscode.Position(0, 0));
      } catch {
        return undefined;
      }
    }

    // Prefixed path (e.g. @ui/modal.jinja): strip prefix, search workspace
    let searchPath = importPath;
    if (importPath.startsWith("@")) {
      const slashIndex = importPath.indexOf("/");
      if (slashIndex !== -1) {
        searchPath = importPath.substring(slashIndex + 1);
      }
    }

    // Absolute / prefixed: search workspace
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
