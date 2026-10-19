/**
 * Lets `node --test` load the app's TypeScript directly (Node 24 strips types natively) by
 * resolving the `@/` alias and extensionless imports inside `src/`.
 */
import { registerHooks } from 'node:module';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const CANDIDATES = ['', '.ts', '.tsx', '.js', '/index.ts'];

function findFile(base) {
  for (const suffix of CANDIDATES) {
    try {
      if (statSync(base + suffix).isFile()) return base + suffix;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    let base = null;
    if (specifier.startsWith('@/')) {
      base = path.join(SRC, specifier.slice(2));
    } else if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:') &&
      fileURLToPath(context.parentURL).startsWith(SRC)
    ) {
      base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    }
    const file = base && findFile(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      /** Packages without an `exports` map (Next 14's `next/server`) need the file extension. */
      if (error?.code === 'ERR_MODULE_NOT_FOUND' && !specifier.startsWith('.')) {
        return nextResolve(`${specifier}.js`, context);
      }
      throw error;
    }
  },
});
