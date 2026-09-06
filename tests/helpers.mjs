import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

export function loadTS(relativePath, overrides = {}, environment = {}) {
  const filename = path.resolve(import.meta.dirname, '..', relativePath);
  const requireFromFile = createRequire(filename);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loadedModule = { exports: {} };
  const requireLocal = id => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      const target = [base + '.ts', path.join(base, 'index.ts')].find(file => fs.existsSync(file));
      if (target) return loadTS(target, overrides, environment);
    }
    return requireFromFile(id);
  };
  vm.runInThisContext(`(function(exports,require,module,__filename,__dirname,process){${source}\n})`, { filename })(loadedModule.exports, requireLocal, loadedModule, filename, path.dirname(filename), { env: environment });
  return loadedModule.exports;
}
