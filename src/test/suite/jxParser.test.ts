import * as assert from "assert";
import * as vscode from "vscode";
import { parseImports } from "../../jxParser";

suite("jxParser", () => {
  test("parses a standard import", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content: '{# import "./button.jinja" as Button #}',
    });
    const imports = parseImports(doc);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].name, "Button");
    assert.strictEqual(imports[0].path, "./button.jinja");
  });

  test("parses whitespace-trimming variants", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content: '{#- import "./card.jinja" as Card -#}',
    });
    const imports = parseImports(doc);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].name, "Card");
    assert.strictEqual(imports[0].path, "./card.jinja");
  });

  test("parses multiple imports", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content: [
        '{# import "./button.jinja" as Button #}',
        '{# import "./card.jinja" as Card #}',
      ].join("\n"),
    });
    const imports = parseImports(doc);
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(imports[0].name, "Button");
    assert.strictEqual(imports[1].name, "Card");
  });

  test("returns empty array for no imports", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content: "<div>Hello</div>",
    });
    const imports = parseImports(doc);
    assert.strictEqual(imports.length, 0);
  });

  test("calculates correct path range", async () => {
    const content = '{# import "./button.jinja" as Button #}';
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content,
    });
    const imports = parseImports(doc);
    const pathText = doc.getText(imports[0].pathRange);
    assert.strictEqual(pathText, "./button.jinja");
  });

  test("calculates correct name range", async () => {
    const content = '{# import "./button.jinja" as Button #}';
    const doc = await vscode.workspace.openTextDocument({
      language: "jx",
      content,
    });
    const imports = parseImports(doc);
    const nameText = doc.getText(imports[0].nameRange);
    assert.strictEqual(nameText, "Button");
  });
});
