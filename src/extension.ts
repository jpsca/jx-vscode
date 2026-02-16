import * as vscode from "vscode";
import { JxDefinitionProvider } from "./definitionProvider";
import { JxDiagnosticsProvider } from "./diagnosticsProvider";
import { CatalogScanner } from "./catalogScanner";
import { JxFormattingProvider } from "./formattingProvider";

let diagnosticsProvider: JxDiagnosticsProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: "jx" };

  const catalogScanner = new CatalogScanner();
  context.subscriptions.push(catalogScanner);

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selector,
      new JxDefinitionProvider(catalogScanner)
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      selector,
      new JxFormattingProvider()
    )
  );

  // Diagnostics
  if (vscode.workspace.getConfiguration("jx").get<boolean>("check.enabled", true)) {
    diagnosticsProvider = new JxDiagnosticsProvider(catalogScanner);
    context.subscriptions.push(diagnosticsProvider);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("jx.check.enabled") || e.affectsConfiguration("jx.catalogPath")) {
        const enabled = vscode.workspace
          .getConfiguration("jx")
          .get<boolean>("check.enabled", true);
        if (enabled && !diagnosticsProvider) {
          diagnosticsProvider = new JxDiagnosticsProvider(catalogScanner);
          context.subscriptions.push(diagnosticsProvider);
        } else if (!enabled && diagnosticsProvider) {
          diagnosticsProvider.dispose();
          diagnosticsProvider = undefined;
        } else if (enabled && diagnosticsProvider) {
          // Catalog path changed — recreate to pick up new config
          diagnosticsProvider.dispose();
          diagnosticsProvider = new JxDiagnosticsProvider(catalogScanner);
          context.subscriptions.push(diagnosticsProvider);
        }
      }
    })
  );
}

export function deactivate() {}
