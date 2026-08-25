'use client';

import { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { usePopover, PopoverPanel } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { searchDestinations, destinationSubtitle } from '@/lib/destinations';

export interface DestinationFieldProps {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}

// Input de texto livre (o usuário pode digitar qualquer cidade — não é um
// select restrito a catálogo) com sugestões de destinos populares abaixo.
export function DestinationField({
  name,
  label,
  placeholder,
  defaultValue = '',
  required,
  className,
}: DestinationFieldProps) {
  const { open, setOpen, ref } = usePopover();
  const [value, setValue] = useState(defaultValue);

  const suggestions = searchDestinations(value);

  return (
    <div ref={ref} className={cn('relative space-y-1.5', className)}>
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          maxLength={80}
          className="flex h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {open && suggestions.length > 0 && (
        <PopoverPanel className="w-72 p-2">
          <ul className="max-h-64 overflow-y-auto">
            {suggestions.map((d) => (
              <li key={d.label}>
                <button
                  type="button"
                  onClick={() => {
                    setValue(d.label);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{d.label}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{destinationSubtitle(d)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </PopoverPanel>
      )}
    </div>
  );
}
