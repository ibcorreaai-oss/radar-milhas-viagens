'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useToast } from '@/components/toast-provider';
import type { ToastVariant } from '@/components/toast-provider';

export interface QueryToastRule {
  /** Nome do query param que, se presente com esse valor, dispara o toast. */
  param: string;
  value: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

// Lê query params de confirmação (`?sucesso=1`, `?onboarded=1` etc.) no
// primeiro render, dispara o toast correspondente e remove o param da URL
// (router.replace, sem reload) — pra não reaparecer se a pessoa atualizar
// a página. Regra: o PRIMEIRO rule cujo param bater é o único disparado
// (evita dois toasts empilhados se, por acaso, mais de um param existir).
export function ToastFromQuery({ rules }: { rules: QueryToastRule[] }) {
  const { show } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;

    const matched = rules.find((rule) => searchParams.get(rule.param) === rule.value);
    if (!matched) return;

    firedRef.current = true;
    show({ variant: matched.variant, title: matched.title, description: matched.description });

    const next = new URLSearchParams(searchParams.toString());
    next.delete(matched.param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
