import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // lib/providers/*.ts (Amadeus/Booking/Duffel) usam parâmetros com "_"
      // de propósito -- adapters fora do MVP, nunca invocados de verdade
      // (ver PROMPT WORLD EXPERIENCE RADAR: "não habilite API paga sem
      // aprovação"), a assinatura da função precisa bater com a interface
      // do provider mesmo sem usar o argumento ainda.
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
];

export default eslintConfig;
