import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Achievement } from '@/lib/achievements';

export function AchievementsPanel({ achievements }: { achievements: Achievement[] }) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const percent = Math.round((unlockedCount / achievements.length) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Suas conquistas</CardTitle>
        <CardDescription>
          {unlockedCount} de {achievements.length} concluídas
        </CardDescription>
        <Progress value={percent} label="Conquistas concluídas" className="mt-2" />
      </CardHeader>
      <CardContent>
        <ul className="grid gap-3 sm:grid-cols-2">
          {achievements.map((a) => (
            <li key={a.key} className="flex items-start gap-2.5 text-sm">
              {a.unlocked ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p className={a.unlocked ? 'font-medium text-foreground' : 'font-medium text-muted-foreground'}>
                  {a.label}
                </p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
