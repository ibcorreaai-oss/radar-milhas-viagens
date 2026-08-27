'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CRUISE_CATEGORY_LABEL, CRUISE_REGION_TAG_LABEL, type CruiseCategory, type CruiseRegionTag } from '@/lib/types';

const CATEGORY_OPTIONS = Object.keys(CRUISE_CATEGORY_LABEL) as CruiseCategory[];
const REGION_OPTIONS = Object.keys(CRUISE_REGION_TAG_LABEL) as CruiseRegionTag[];

export function CruiseFilters() {
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
      <div className="w-52 space-y-1.5">
        <Label htmlFor="categoria">Categoria</Label>
        <Select id="categoria" value={searchParams.get('categoria') ?? ''} onChange={(e) => updateParam('categoria', e.target.value)}>
          <option value="">Todas</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CRUISE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48 space-y-1.5">
        <Label htmlFor="regiao">Região</Label>
        <Select id="regiao" value={searchParams.get('regiao') ?? ''} onChange={(e) => updateParam('regiao', e.target.value)}>
          <option value="">Todas</option>
          {REGION_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {CRUISE_REGION_TAG_LABEL[r]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
