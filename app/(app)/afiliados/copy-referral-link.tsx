'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function CopyReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard bloqueado (permissão, contexto não seguro) — a pessoa
      // ainda consegue selecionar e copiar o texto do input manualmente.
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input readOnly value={link} onFocus={(e) => e.target.select()} className="font-mono text-sm" />
      <Button type="button" variant="secondary" onClick={handleCopy} className="shrink-0 gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copiado!' : 'Copiar link'}
      </Button>
    </div>
  );
}
