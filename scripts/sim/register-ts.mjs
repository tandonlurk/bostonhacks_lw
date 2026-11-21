import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
export const require = createRequire(import.meta.url);
const Module = require('node:module');
const resolve = Module._resolveFilename;
Module._resolveFilename = function(specifier, parent, ...rest) {
  return resolve.call(this, specifier.startsWith('@/') ? path.join(process.cwd(), 'src', specifier.slice(2)) : specifier, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText, filename);
