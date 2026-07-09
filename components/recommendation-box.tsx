import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RecommendationBox({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  return (
    <div
      className={cn(
        'flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground',
        className
      )}
    >
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>{text}</p>
    </div>
  );
}
