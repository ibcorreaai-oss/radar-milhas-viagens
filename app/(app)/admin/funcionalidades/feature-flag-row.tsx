'use client';

import { Switch } from '@/components/ui/switch';
import { useOptimisticToggle } from '@/lib/use-optimistic-toggle';
import { toggleFeatureFlag } from './actions';

export function FeatureFlagRow({
  flagKey,
  label,
  description,
  initialEnabled,
}: {
  flagKey: string;
  label: string;
  description: string | null;
  initialEnabled: boolean;
}) {
  const { value: enabled, pending, toggle } = useOptimisticToggle(initialEnabled, (next) =>
    toggleFeatureFlag(flagKey, next)
  );

  return (
    <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={(next) => toggle(next, `${label} ${next ? 'ativada' : 'desativada'}.`)}
        disabled={pending}
      />
    </div>
  );
}
