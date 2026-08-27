'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { STAY_CATEGORY_LABEL, EXPERIENCE_TAG_LABEL, type StayCategory, type ExperienceTag } from '@/lib/types';

const CATEGORY_OPTIONS = Object.keys(STAY_CATEGORY_LABEL) as StayCategory[];
const TAG_OPTIONS = Object.keys(EXPERIENCE_TAG_LABEL) as ExperienceTag[];

export function StayFilters() {
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
              {STAY_CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48 space-y-1.5">
        <Label htmlFor="tag">Experiência</Label>
        <Select id="tag" value={searchParams.get('tag') ?? ''} onChange={(e) => updateParam('tag', e.target.value)}>
          <option value="">Todas</option>
          {TAG_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {EXPERIENCE_TAG_LABEL[t]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
