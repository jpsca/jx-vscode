import * as vscode from "vscode";

export interface JxImport {
  name: string;
  path: string;
  nameRange: vscode.Range;
  pathRange: vscode.Range;
}

// Mirrors meta.py RX_IMPORT + RX_IMPORT_START and parser.py re_tag_name
const RX_IMPORT =
  /\{#-?\s*import\s+"([^"]+)"\s+as\s+([A-Z][0-9A-Za-z_.:$-]*)\s*-?#\}/g;

export function parseImports(document: vscode.TextDocument): JxImport[] {
  const text = document.getText();
  const results: JxImport[] = [];

  let match: RegExpExecArray | null;
  RX_IMPORT.lastIndex = 0;

  while ((match = RX_IMPORT.exec(text)) !== null) {
    const fullMatchStart = match.index;
    const fullMatch = match[0];

    const pathValue = match[1];
    const nameValue = match[2];

    // Find the path string position (the quoted portion)
    const pathQuoteOffset = fullMatch.indexOf('"');
    const pathStart = fullMatchStart + pathQuoteOffset + 1; // after opening quote
    const pathEnd = pathStart + pathValue.length;

    // Find the name position (after "as ")
    const asIndex = fullMatch.indexOf(" as ");
    const nameStart = fullMatchStart + asIndex + 4;
    const nameEnd = nameStart + nameValue.length;

    results.push({
      name: nameValue,
      path: pathValue,
      pathRange: new vscode.Range(
        document.positionAt(pathStart),
        document.positionAt(pathEnd)
      ),
      nameRange: new vscode.Range(
        document.positionAt(nameStart),
        document.positionAt(nameEnd)
      ),
    });
  }

  return results;
}
