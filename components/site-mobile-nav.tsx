'use client';

import Link from 'next/link';
import { Menu } from 'lucide-react';
import { usePopover, PopoverPanel } from '@/components/ui/popover';
import { ThemeToggle } from '@/components/theme-toggle';

// Menu hambúrguer do header público — sem isto, "Como funciona"/"Preços"/
// "Termos"/"Entrar" ficavam inacessíveis em telas < md (nav e "Entrar" só
// apareciam a partir de md/sm). Achado durante o teste de regressão
// mobile da ETAPA 10. Reaproveita o mesmo Popover de components/ui/popover.tsx
// já usado nos campos de busca (destino/datas/hóspedes).
export function SiteMobileNav() {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Abrir menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <PopoverPanel className="right-0 w-56 !left-auto p-2">
          <nav className="flex flex-col text-sm font-medium text-muted-foreground">
            <Link
              href="/#como-funciona"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground"
            >
              Como funciona
            </Link>
            <Link
              href="/#precos"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground"
            >
              Preços
            </Link>
            <Link
              href="/termos"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground"
            >
              Termos
            </Link>
            <Link
              href="/contato"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground"
            >
              Contato
            </Link>
            <div className="my-1 h-px bg-border" />
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 hover:bg-muted hover:text-foreground"
            >
              Entrar
            </Link>
            <div className="my-1 h-px bg-border" />
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs font-medium">Tema</span>
              <ThemeToggle />
            </div>
          </nav>
        </PopoverPanel>
      )}
    </div>
  );
}
