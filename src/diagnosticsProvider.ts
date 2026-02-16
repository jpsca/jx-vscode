import * as vscode from "vscode";
import * as cp from "child_process";
import { CatalogScanner } from "./catalogScanner";

interface CheckError {
  file: string;
  line: number | null;
  message: string;
  suggestion: string | null;
  abs_path: string | null;
}

interface CheckResult {
  checked: number;
  errors: CheckError[];
}

export class JxDiagnosticsProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private disposables: vscode.Disposable[] = [];
  private previousUris = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private catalogScanner: CatalogScanner) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("jx");

    this.disposables.push(
      this.diagnosticCollection,

      vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.languageId === "jx" || doc.languageId === "python") {
          this.scheduleCheck();
        }
      }),

      vscode.workspace.onDidOpenTextDocument((doc) => {
        if (doc.languageId === "jx") {
          this.scheduleCheck();
        }
      }),

      vscode.workspace.onDidCloseTextDocument((doc) => {
        this.diagnosticCollection.delete(doc.uri);
        this.previousUris.delete(doc.uri.toString());
      })
    );

    // Initial check
    this.scheduleCheck();
  }

  /** Debounce checks to avoid running multiple times in quick succession. */
  private scheduleCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      this.checkAll();
    }, 300);
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

  private resolveCatalogPath(): string | undefined {
    // 1. User setting
    const configured = vscode.workspace
      .getConfiguration("jx")
      .get<string>("catalogPath", "");
    if (configured) {
      return configured;
    }

    // 2. Auto-detected from CatalogScanner
    if (this.catalogScanner.catalogPaths.length > 0) {
      return this.catalogScanner.catalogPaths[0];
    }

    return undefined;
  }

  private async checkAll(): Promise<void> {
    await this.catalogScanner.ready();

    const catalogPath = this.resolveCatalogPath();
    if (!catalogPath) {
      // No catalog path available — clear all and skip
      this.diagnosticCollection.clear();
      this.previousUris.clear();
      return;
    }

    const pythonPath = await this.resolvePythonPath();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const cwd = workspaceFolder?.uri.fsPath;

    const args = ["-m", "jx", "check", catalogPath, "--format", "json"];

    return new Promise<void>((resolve) => {
      cp.execFile(
        pythonPath,
        args,
        { cwd, timeout: 15000 },
        (_error, stdout, _stderr) => {
          const output = stdout.trim();
          if (!output) {
            this.diagnosticCollection.clear();
            this.previousUris.clear();
            resolve();
            return;
          }

          let result: CheckResult;
          try {
            result = JSON.parse(output);
          } catch {
            // Not valid JSON — jx might not be installed or wrong version
            this.diagnosticCollection.clear();
            this.previousUris.clear();
            resolve();
            return;
          }

          // Group errors by absolute file path
          const errorsByFile = new Map<string, CheckError[]>();
          for (const err of result.errors) {
            const filePath = err.abs_path;
            if (!filePath) {
              continue;
            }
            const existing = errorsByFile.get(filePath) ?? [];
            existing.push(err);
            errorsByFile.set(filePath, existing);
          }

          // Set diagnostics for files with errors
          const currentUris = new Set<string>();
          for (const [filePath, errors] of errorsByFile) {
            const uri = vscode.Uri.file(filePath);
            const uriStr = uri.toString();
            currentUris.add(uriStr);

            const diagnostics: vscode.Diagnostic[] = errors.map((err) => {
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

            this.diagnosticCollection.set(uri, diagnostics);
          }

          // Clear diagnostics from files that no longer have errors
          for (const uriStr of this.previousUris) {
            if (!currentUris.has(uriStr)) {
              this.diagnosticCollection.set(vscode.Uri.parse(uriStr), []);
            }
          }

          this.previousUris = currentUris;
          resolve();
        }
      );
    });
  }

  dispose() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
