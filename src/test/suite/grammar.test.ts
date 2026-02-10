import * as assert from "assert";
import * as path from "path";
import * as fs from "fs";
import * as vsctm from "vscode-textmate";
import * as oniguruma from "vscode-oniguruma";

interface Token {
  text: string;
  scopes: string[];
}

suite("Grammar", () => {
  let grammar: vsctm.IGrammar;

  suiteSetup(async () => {
    const wasmPath = path.resolve(
      __dirname,
      "../../../node_modules/vscode-oniguruma/release/onig.wasm"
    );
    const wasmBin = fs.readFileSync(wasmPath).buffer;
    await oniguruma.loadWASM({ data: wasmBin });

    const onigLib: vsctm.IOnigLib = {
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    };

    const grammarPath = path.resolve(
      __dirname,
      "../../../syntaxes/jx.tmLanguage.json"
    );
    const grammarContent = fs.readFileSync(grammarPath, "utf-8");

    const registry = new vsctm.Registry({
      onigLib: Promise.resolve(onigLib),
      loadGrammar: async (scopeName) => {
        if (scopeName === "text.html.jx") {
          return vsctm.parseRawGrammar(grammarContent, grammarPath);
        }
        return null;
      },
    });

    const g = await registry.loadGrammar("text.html.jx");
    if (!g) {
      throw new Error("Failed to load grammar");
    }
    grammar = g;
  });

  function tokenize(line: string): Token[] {
    const result = grammar.tokenizeLine(line, vsctm.INITIAL);
    return result.tokens.map((token, i) => {
      const end =
        i + 1 < result.tokens.length
          ? result.tokens[i + 1].startIndex
          : line.length;
      return {
        text: line.substring(token.startIndex, end),
        scopes: token.scopes,
      };
    });
  }

  function hasScope(token: Token, scope: string): boolean {
    return token.scopes.some((s) => s.includes(scope));
  }

  test("Jinja expression in component attribute is highlighted correctly", () => {
    const tokens = tokenize('<Layout title={{ page.title }}>');

    const titleAttr = tokens.find((t) => t.text === "title");
    assert.ok(titleAttr, "Should find title token");
    assert.ok(
      hasScope(titleAttr, "entity.other.attribute-name"),
      `title should be attribute name, got: ${titleAttr.scopes.join(", ")}`
    );

    const openBraces = tokens.find((t) => t.text.includes("{{"));
    assert.ok(openBraces, "Should find {{ token");
    assert.ok(
      hasScope(openBraces, "punctuation.definition.expression.begin.jinja"),
      `{{ should be jinja expression begin, got: ${openBraces.scopes.join(", ")}`
    );

    const pageVar = tokens.find((t) => t.text === "page");
    assert.ok(pageVar, "Should find page token");
    assert.ok(
      hasScope(pageVar, "variable.other.jinja"),
      `page should be jinja variable, got: ${pageVar.scopes.join(", ")}`
    );
    assert.ok(
      !hasScope(pageVar, "string.unquoted"),
      `page should NOT be unquoted string, got: ${pageVar.scopes.join(", ")}`
    );

    const closeBraces = tokens.find((t) => t.text.includes("}}"));
    assert.ok(closeBraces, "Should find }} token");
    assert.ok(
      hasScope(closeBraces, "punctuation.definition.expression.end.jinja"),
      `}} should be jinja expression end, got: ${closeBraces.scopes.join(", ")}`
    );
  });

  test("quoted attribute values still work in component tags", () => {
    const tokens = tokenize('<Layout description="Hello">');

    const attr = tokens.find((t) => t.text === "description");
    assert.ok(attr, "Should find description token");
    assert.ok(
      hasScope(attr, "entity.other.attribute-name"),
      `description should be attribute name, got: ${attr.scopes.join(", ")}`
    );

    const value = tokens.find((t) => t.text.includes('"Hello"'));
    assert.ok(value, "Should find quoted value token");
    assert.ok(
      hasScope(value, "string.quoted"),
      `"Hello" should be quoted string, got: ${value.scopes.join(", ")}`
    );
  });

  test("mixed quoted and expression attributes", () => {
    const tokens = tokenize(
      '<Layout title={{ page.title }} description="Hello">'
    );

    // title should be attribute name
    const titleAttr = tokens.find((t) => t.text === "title");
    assert.ok(titleAttr);
    assert.ok(hasScope(titleAttr, "entity.other.attribute-name"));

    // {{ should be jinja expression
    const openBraces = tokens.find((t) => t.text.includes("{{"));
    assert.ok(openBraces);
    assert.ok(
      hasScope(openBraces, "punctuation.definition.expression.begin.jinja")
    );

    // description should also be attribute name
    const descAttr = tokens.find((t) => t.text === "description");
    assert.ok(descAttr);
    assert.ok(hasScope(descAttr, "entity.other.attribute-name"));

    // "Hello" should be quoted string
    const helloValue = tokens.find((t) => t.text.includes('"Hello"'));
    assert.ok(helloValue);
    assert.ok(hasScope(helloValue, "string.quoted"));
  });
});
