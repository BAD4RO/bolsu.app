import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
const require = createRequire(import.meta.url);
const compat = new FlatCompat({ baseDirectory: import.meta.dirname, resolvePluginsRelativeTo: dirname(require.resolve('eslint-config-next/package.json')) });
export default [
  { ignores: ['.next/**','node_modules/**','tools/**/node_modules/**','.pnpm-store/**','next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals'),
];
