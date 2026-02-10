"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const path = require("path");
const vscode = require("vscode");
const definitionProvider_1 = require("../../definitionProvider");
const fixturesPath = path.resolve(__dirname, "../../../src/test/fixtures");
suite("JxDefinitionProvider", () => {
    const provider = new definitionProvider_1.JxDefinitionProvider();
    test("resolves definition from import path", async () => {
        const sampleUri = vscode.Uri.file(path.join(fixturesPath, "sample.jinja"));
        const doc = await vscode.workspace.openTextDocument(sampleUri);
        // Position inside the path string "./button.jinja"
        const pathPos = new vscode.Position(0, 15);
        const result = await provider.provideDefinition(doc, pathPos, new vscode.CancellationTokenSource().token);
        assert.ok(result, "Should return a definition");
        const loc = result;
        assert.ok(loc.uri.fsPath.endsWith("button.jinja"), `Expected button.jinja, got ${loc.uri.fsPath}`);
    });
    test("resolves definition from alias name", async () => {
        const sampleUri = vscode.Uri.file(path.join(fixturesPath, "sample.jinja"));
        const doc = await vscode.workspace.openTextDocument(sampleUri);
        // Position on "Button" alias in the import line
        const namePos = new vscode.Position(0, 33);
        const result = await provider.provideDefinition(doc, namePos, new vscode.CancellationTokenSource().token);
        assert.ok(result, "Should return a definition");
        const loc = result;
        assert.ok(loc.uri.fsPath.endsWith("button.jinja"), `Expected button.jinja, got ${loc.uri.fsPath}`);
    });
    test("resolves definition from component tag", async () => {
        const sampleUri = vscode.Uri.file(path.join(fixturesPath, "sample.jinja"));
        const doc = await vscode.workspace.openTextDocument(sampleUri);
        // Position on "Button" in <Button label="Click me" />
        // Line 3: "  <Button label="Click me" />"  — 'B' is at column 3
        const tagPos = new vscode.Position(3, 4);
        const result = await provider.provideDefinition(doc, tagPos, new vscode.CancellationTokenSource().token);
        assert.ok(result, "Should return a definition");
        const loc = result;
        assert.ok(loc.uri.fsPath.endsWith("button.jinja"), `Expected button.jinja, got ${loc.uri.fsPath}`);
    });
    test("returns undefined for non-component text", async () => {
        const sampleUri = vscode.Uri.file(path.join(fixturesPath, "sample.jinja"));
        const doc = await vscode.workspace.openTextDocument(sampleUri);
        // Position on the <div> tag (not a component)
        const divPos = new vscode.Position(2, 2);
        const result = await provider.provideDefinition(doc, divPos, new vscode.CancellationTokenSource().token);
        assert.strictEqual(result, undefined);
    });
});
//# sourceMappingURL=definitionProvider.test.js.map