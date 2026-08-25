import { CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { ProfileCompletenessItem } from '@/lib/profile-completeness';

// Barra + checklist de completude — reaproveitada no onboarding (estado
// local, ainda não salvo) e em /perfil (estado já salvo). Ver
// lib/profile-completeness.ts pro cálculo.
export function ProfileCompletenessBar({
  percent,
  items,
  compact,
}: {
  percent: number;
  items: ProfileCompletenessItem[];
  compact?: boolean;
}) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', compact && 'p-3')}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Perfil {percent}% completo</p>
        {percent === 100 && (
          <span className="text-xs font-medium text-success">Perfil completo ✓</span>
        )}
      </div>
      <Progress value={percent} label="Completude do perfil" className="mt-2" />
      {!compact && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key} className="flex items-center gap-1.5 text-xs">
              {item.done ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
