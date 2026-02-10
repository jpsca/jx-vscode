"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const path = require("path");
const Mocha = require("mocha");
const glob_1 = require("glob");
async function run() {
    const mocha = new Mocha({ ui: "tdd", timeout: 10000 });
    const testsRoot = path.resolve(__dirname, ".");
    const files = await (0, glob_1.glob)("**/**.test.js", { cwd: testsRoot });
    for (const f of files) {
        mocha.addFile(path.resolve(testsRoot, f));
    }
    return new Promise((resolve, reject) => {
        mocha.run((failures) => {
            if (failures > 0) {
                reject(new Error(`${failures} tests failed.`));
            }
            else {
                resolve();
            }
        });
    });
}
//# sourceMappingURL=index.js.map