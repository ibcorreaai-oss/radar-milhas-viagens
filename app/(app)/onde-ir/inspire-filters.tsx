'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { INSPIRE_MODE_LABEL, type InspireMode } from '@/lib/inspire-engine';

const MODE_OPTIONS = Object.keys(INSPIRE_MODE_LABEL) as InspireMode[];
const CONTINENT_OPTIONS = ['África', 'América do Norte', 'América do Sul', 'Ásia', 'Europa', 'Oceania'];

export function InspireFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMode = (searchParams.get('modo') as InspireMode) || 'surpreenda';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MODE_OPTIONS.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => updateParam('modo', mode)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              currentMode === mode
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {INSPIRE_MODE_LABEL[mode]}
          </button>
        ))}
      </div>
      <div className="w-56 space-y-1.5">
        <Label htmlFor="continente">Continente (opcional)</Label>
        <Select id="continente" value={searchParams.get('continente') ?? ''} onChange={(e) => updateParam('continente', e.target.value)}>
          <option value="">Qualquer continente</option>
          {CONTINENT_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
