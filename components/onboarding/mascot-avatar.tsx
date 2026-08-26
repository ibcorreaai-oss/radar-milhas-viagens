'use client';

import { cn } from '@/lib/utils';

interface MascotAvatarProps {
  speaking?: boolean;
  className?: string;
}

// "Rada" — mascote do onboarding (ETAPA 18, ver ENGAGEMENT_UX.md). SVG puro
// + Tailwind, sem imagem/vídeo gerado por IA de propósito: zero custo de
// API nova (ver [[feedback_gasto_zero_api_novas]]), zero dependência
// externa, tema claro/escuro de graça (usa currentColor/var(--primary)).
// O prato de radar giratório reforça a marca ("Radar Milhas"); a boca
// anima em loop curto só enquanto `speaking` é true (ligado ao toggle de
// leitura em voz alta do AvatarMessage).
export function MascotAvatar({ speaking, className }: MascotAvatarProps) {
  return (
    // ETAPA 19 (auditoria de acessibilidade pré-deploy): as 3 animações em
    // loop infinito (float/sweep/talk) agora só rodam com
    // `motion-safe:` — respeitam `prefers-reduced-motion`, mesmo cuidado
    // que o efeito de "digitando" do AvatarMessage já tinha.
    <div className={cn('relative h-20 w-20 shrink-0 motion-safe:animate-mascot-float', className)}>
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        {/* prato de radar, gira devagar atrás da cabeça */}
        <g className="origin-center motion-safe:animate-mascot-sweep" style={{ transformOrigin: '50px 30px' }}>
          <circle cx="50" cy="30" r="22" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 6" opacity="0.35" />
        </g>
        {/* haste */}
        <line x1="50" y1="30" x2="50" y2="44" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" />
        {/* corpo */}
        <rect x="26" y="44" width="48" height="42" rx="16" fill="hsl(var(--primary))" />
        {/* rosto */}
        <circle cx="40" cy="63" r="4" fill="hsl(var(--primary-foreground))">
          <animate attributeName="ry" values="4;0.5;4" keyTimes="0;0.5;1" dur="4.5s" repeatCount="indefinite" begin="1s" />
        </circle>
        <circle cx="60" cy="63" r="4" fill="hsl(var(--primary-foreground))">
          <animate attributeName="ry" values="4;0.5;4" keyTimes="0;0.5;1" dur="4.5s" repeatCount="indefinite" begin="1s" />
        </circle>
        <rect
          x="42"
          y="74"
          width="16"
          height={speaking ? 6 : 3}
          rx="3"
          fill="hsl(var(--primary-foreground))"
          className={cn('origin-center transition-[height]', speaking && 'motion-safe:animate-mascot-talk')}
        />
      </svg>
    </div>
  );
}
