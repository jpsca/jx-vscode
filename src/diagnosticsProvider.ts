import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";

interface CheckError {
  file: string;
  line: number | null;
  message: string;
  suggestion: string | null;
}

interface CheckResult {
  checked: number;
  errors: CheckError[];
}

export class JxDiagnosticsProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("jx");

    this.disposables.push(
      this.diagnosticCollection,

      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.languageId === "jx") {
          this.checkFile(doc);
        }
      }),

      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === "jx") {
          this.checkFile(doc);
        }
      }),

      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
      })
    );

    // Check all already-open jx documents
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.languageId === "jx") {
        this.checkFile(doc);
      }
    }
  }

  private async resolvePythonPath(): Promise<string> {
    // 1. User setting
    const configured = vscode.workspace
      .getConfiguration("jx")
      .get<string>("pythonPath", "");
    if (configured) {
      return configured;
    }

    // 2. Python extension API
    try {
      const pythonExt = vscode.extensions.getExtension("ms-python.python");
      if (pythonExt) {
        if (!pythonExt.isActive) {
          await pythonExt.activate();
        }
        const envPath =
          pythonExt.exports?.environments?.getActiveEnvironmentPath?.();
        if (envPath?.path) {
          return envPath.path;
        }
      }
    } catch {
      // Fall through to default
    }

    // 3. Fallback
    return "python3";
  }

  private async checkFile(document: vscode.TextDocument): Promise<void> {
    const pythonPath = await this.resolvePythonPath();
    const filePath = document.uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(filePath);

    return new Promise<void>((resolve) => {
      cp.execFile(
        pythonPath,
        ["-m", "jx", "check", "--format", "json", filePath],
        { cwd, timeout: 10000 },
        (error, stdout, _stderr) => {
          // jx check exits 1 when errors are found, which is normal
          const output = stdout.trim();
          if (!output) {
            this.diagnosticCollection.delete(document.uri);
            resolve();
            return;
          }

          let result: CheckResult;
          try {
            result = JSON.parse(output);
          } catch {
            // Not valid JSON — jx might not be installed or wrong version
            this.diagnosticCollection.delete(document.uri);
            resolve();
            return;
          }

          const diagnostics: vscode.Diagnostic[] = result.errors.map((err) => {
            const line = err.line ? err.line - 1 : 0;
            const range = new vscode.Range(line, 0, line, Number.MAX_VALUE);

            let message = err.message;
            if (err.suggestion) {
              message += ` (did you mean '${err.suggestion}'?)`;
            }

            const diagnostic = new vscode.Diagnostic(
              range,
              message,
              vscode.DiagnosticSeverity.Error
            );
            diagnostic.source = "jx";
            return diagnostic;
          });

          this.diagnosticCollection.set(document.uri, diagnostics);
          resolve();
        }
      );
    });
  }

  dispose() {
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
