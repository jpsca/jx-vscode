"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const definitionProvider_1 = require("./definitionProvider");
const diagnosticsProvider_1 = require("./diagnosticsProvider");
let diagnosticsProvider;
function activate(context) {
    const selector = { language: "jx" };
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, new definitionProvider_1.JxDefinitionProvider()));
    // Diagnostics
    if (vscode.workspace.getConfiguration("jx").get("check.enabled", true)) {
        diagnosticsProvider = new diagnosticsProvider_1.JxDiagnosticsProvider();
        context.subscriptions.push(diagnosticsProvider);
    }
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("jx.check.enabled")) {
            const enabled = vscode.workspace
                .getConfiguration("jx")
                .get("check.enabled", true);
            if (enabled && !diagnosticsProvider) {
                diagnosticsProvider = new diagnosticsProvider_1.JxDiagnosticsProvider();
                context.subscriptions.push(diagnosticsProvider);
            }
            else if (!enabled && diagnosticsProvider) {
                diagnosticsProvider.dispose();
                diagnosticsProvider = undefined;
            }
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map