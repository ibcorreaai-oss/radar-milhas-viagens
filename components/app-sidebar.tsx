'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Compass,
  Plane,
  Hotel,
  Building2,
  Calculator,
  Heart,
  Star,
  Bell,
  Tag,
  Award,
  Sparkles,
  User,
  CreditCard,
  Share2,
  SquarePlay,
  ShieldCheck,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FeatureFlagKey } from '@/lib/types';

// `children` existe na tipagem pra sidebar já nascer pronta pra submenu
// (ETAPA 12 pediu isso explicitamente), mas NENHUM item usa hoje — não
// construí a interação de flyout/popover porque não há nada real pra
// testar contra ela (ver resumo da etapa). Se um dia um item ganhar
// `children`, a função renderItem precisa ganhar esse tratamento.
export interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  flag?: FeatureFlagKey;
  children?: { href: string; label: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/descobrir', label: 'Descobrir', icon: Compass, flag: 'worldRadar' },
  { href: '/voos', label: 'Voos', icon: Plane },
  { href: '/hoteis', label: 'Hotéis', icon: Hotel },
  { href: '/estadias', label: 'Estadias', icon: Building2, flag: 'stayExperience' },
  { href: '/calculadora', label: 'Calculadora', icon: Calculator },
  { href: '/bucket-list', label: 'Bucket List', icon: Heart, flag: 'bucketList' },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/favoritos', label: 'Favoritos', icon: Star },
  { href: '/promocoes', label: 'Promoções', icon: Tag },
  { href: '/programas', label: 'Programas', icon: Award },
  { href: '/consultor-ia', label: 'Consultor IA', icon: Sparkles },
];

export const ACCOUNT_ITEMS: NavItem[] = [
  { href: '/perfil', label: 'Perfil', icon: User },
  { href: '/assinatura', label: 'Assinatura', icon: CreditCard },
  { href: '/afiliados', label: 'Indique e ganhe', icon: Share2 },
  // ETAPA 15.2 — perto do fim da lista de conta, antes do botão Sair
  // (este app não tem item "Configurações" separado, Perfil cumpre esse
  // papel — ver TRAINING.md).
  { href: '/treinamentos', label: 'Treinamentos', icon: SquarePlay },
];

export function AppSidebar({
  collapsed,
  onToggleCollapsed,
  isAdmin,
  flags,
  onSignOut,
  className,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isAdmin: boolean;
  flags: Partial<Record<FeatureFlagKey, boolean>>;
  onSignOut: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.flag || flags[item.flag]);

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    const link = (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-2' : 'px-3',
          active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && item.label}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={item.href} label={item.label}>
        {link}
      </Tooltip>
    ) : (
      link
    );
  };

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col overflow-x-hidden overflow-y-auto border-r bg-card p-4 transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
        className
      )}
    >
      <div className={cn('mb-6 flex items-center', collapsed ? 'justify-center' : 'justify-between')}>
        <Link href="/" aria-label="Radar Milhas & Viagens" className={cn('flex items-center gap-2', collapsed && 'px-0')}>
          <Plane className="h-5 w-5 shrink-0 text-primary" />
          {!collapsed && <span className="font-semibold">Radar Milhas</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Recolher menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <Tooltip label="Expandir menu" className="mb-4 self-center">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label="Expandir menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </Tooltip>
      )}

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1">{visibleNavItems.map(renderItem)}</nav>

      <div className="my-3 h-px bg-border" />

      <div className={cn('flex items-center pb-2', collapsed ? 'justify-center' : 'justify-between px-2')}>
        {!collapsed && <span className="text-xs font-medium text-muted-foreground">Tema</span>}
        <ThemeToggle compact={collapsed} />
      </div>

      <nav aria-label="Conta" className="flex flex-col gap-1">
        {ACCOUNT_ITEMS.map(renderItem)}
        {isAdmin &&
          (() => {
            const active = pathname.startsWith('/admin');
            const link = (
              <Link
                href="/admin"
                aria-label="Admin"
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors',
                  collapsed ? 'justify-center px-2' : 'px-3',
                  active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!collapsed && 'Admin'}
              </Link>
            );
            return collapsed ? <Tooltip label="Admin">{link}</Tooltip> : link;
          })()}
        {(() => {
          const button = (
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sair"
              className={cn(
                'mt-1 flex items-center gap-3 rounded-md py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive',
                collapsed ? 'justify-center px-2' : 'px-3'
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && 'Sair'}
            </button>
          );
          return collapsed ? <Tooltip label="Sair">{button}</Tooltip> : button;
        })()}
      </nav>
    </aside>
  );
}
