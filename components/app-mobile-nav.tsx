'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plane, ShieldCheck, LogOut } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { NAV_ITEMS, ACCOUNT_ITEMS, type NavItem } from '@/components/app-sidebar';
import { cn } from '@/lib/utils';
import type { FeatureFlagKey } from '@/lib/types';

// Navegação mobile do dashboard logado (ETAPA 12 — Collapsible Sidebar).
// Antes desta etapa isso NÃO EXISTIA: AppShell renderizava a sidebar de
// 240px direto, sem nenhuma alternativa abaixo de md — achado real durante
// a auditoria de arquitetura pedida no prompt. Reaproveita NAV_ITEMS/
// ACCOUNT_ITEMS de app-sidebar.tsx (mesma fonte de verdade, sem duplicar
// a lista de menu) e o Sheet genérico de components/ui/sheet.tsx.
export function AppMobileNav({
  open,
  onClose,
  isAdmin,
  flags,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  isAdmin: boolean;
  flags: Partial<Record<FeatureFlagKey, boolean>>;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.flag || flags[item.flag]);

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
          active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {item.label}
      </Link>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} ariaLabel="Menu de navegação">
      <div className="flex items-center gap-2 px-4 pb-4 pt-5">
        <Plane className="h-5 w-5 text-primary" />
        <span className="font-semibold">Radar Milhas</span>
      </div>

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">{visibleNavItems.map(renderItem)}</nav>

      <div className="mx-3 my-3 h-px bg-border" />

      <div className="flex items-center justify-between px-3 pb-2">
        <span className="text-xs font-medium text-muted-foreground">Tema</span>
        <ThemeToggle />
      </div>

      <nav aria-label="Conta" className="flex flex-col gap-1 px-3 pb-5">
        {ACCOUNT_ITEMS.map(renderItem)}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={onClose}
            aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Admin
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="mt-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sair
        </button>
      </nav>
    </Sheet>
  );
}
