'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { trackConversion, type ConversionEvent } from '@/lib/analytics';

// ETAPA 15.1 (ver GROWTH.md) — dispara conversão de ads quando um query
// param específico bate (mesmo padrão de components/toast-from-query.tsx:
// reaproveita marcadores de URL que o app já usa pra outra coisa —
// `?onboarded=1` no dashboard, `?sucesso=1` em /assinatura — em vez de
// inventar um mecanismo novo só pra analytics).
//
// Remove o param da URL depois de disparar (achado revisando antes do fim
// da etapa): sem isso, recarregar ou compartilhar a URL com `?sucesso=1`
// ainda na barra de endereço reconta a mesma conversão nas plataformas de
// anúncio toda vez — `/assinatura` não tinha nenhuma limpeza própria de
// query param (diferente do dashboard, que já limpa via ToastFromQuery,
// mas só depois do próprio efeito dela rodar — cada componente precisa
// ser responsável pela própria limpeza, não depender de outro fazer isso).
export function ConversionTracker({
  event,
  param,
  value,
}: {
  event: ConversionEvent;
  param: string;
  value: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (searchParams.get(param) !== value) return;
    firedRef.current = true;
    trackConversion(event);

    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
