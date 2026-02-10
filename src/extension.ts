import * as vscode from "vscode";
import { JxDefinitionProvider } from "./definitionProvider";
import { JxDiagnosticsProvider } from "./diagnosticsProvider";

let diagnosticsProvider: JxDiagnosticsProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  const selector: vscode.DocumentSelector = { language: "jx" };

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      selector,
      new JxDefinitionProvider()
    )
  );

  // Diagnostics
  if (vscode.workspace.getConfiguration("jx").get<boolean>("check.enabled", true)) {
    diagnosticsProvider = new JxDiagnosticsProvider();
    context.subscriptions.push(diagnosticsProvider);
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("jx.check.enabled")) {
        const enabled = vscode.workspace
          .getConfiguration("jx")
          .get<boolean>("check.enabled", true);
        if (enabled && !diagnosticsProvider) {
          diagnosticsProvider = new JxDiagnosticsProvider();
          context.subscriptions.push(diagnosticsProvider);
        } else if (!enabled && diagnosticsProvider) {
          diagnosticsProvider.dispose();
          diagnosticsProvider = undefined;
        }
      }
    })
  );
}

export function deactivate() {}
