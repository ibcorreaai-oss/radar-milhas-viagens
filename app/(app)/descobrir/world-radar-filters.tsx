'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { EventCategory } from '@/lib/types';

const MONTHS = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function WorldRadarFilters({ categories }: { categories: EventCategory[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-4">
      <div className="w-48 space-y-1.5">
        <Label htmlFor="category">Categoria</Label>
        <Select
          id="category"
          value={searchParams.get('categoria') ?? ''}
          onChange={(e) => updateParam('categoria', e.target.value)}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-40 space-y-1.5">
        <Label htmlFor="month">Mês</Label>
        <Select id="month" value={searchParams.get('mes') ?? ''} onChange={(e) => updateParam('mes', e.target.value)}>
          <option value="">Todos</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
