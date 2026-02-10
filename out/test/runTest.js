"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const test_electron_1 = require("@vscode/test-electron");
async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, "../../");
        const extensionTestsPath = path.resolve(__dirname, "./suite/index");
        const testWorkspace = path.resolve(__dirname, "../../src/test/fixtures");
        await (0, test_electron_1.runTests)({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [testWorkspace, "--disable-extensions"],
        });
    }
    catch {
        console.error("Failed to run tests");
        process.exit(1);
    }
}
main();
//# sourceMappingURL=runTest.js.map