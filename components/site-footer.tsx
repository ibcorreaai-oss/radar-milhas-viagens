import Link from 'next/link';
import { Plane } from 'lucide-react';

// Footer público — usado na landing page e nas páginas legais (termos, privacidade, etc).
// Não tem relação com components/app-shell.tsx, que é o shell das páginas logadas.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plane className="h-4 w-4" />
              </span>
              <span>
                Radar Milhas <span className="text-muted-foreground font-normal">&amp; Viagens</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              O clube de assinatura que vigia preços de passagem e hotel — em dinheiro ou em
              pontos — e avisa só quando vale a pena.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Produto</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/#como-funciona" className="hover:text-foreground">
                  Como funciona
                </Link>
              </li>
              <li>
                <Link href="/#precos" className="hover:text-foreground">
                  Preços
                </Link>
              </li>
              <li>
                <Link href="/cadastro" className="hover:text-foreground">
                  Criar conta grátis
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/contato" className="hover:text-foreground">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/termos" className="hover:text-foreground">
                  Termos de uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-foreground">
                  Privacidade e LGPD
                </Link>
              </li>
              <li>
                <Link href="/politica-afiliados" className="hover:text-foreground">
                  Política de afiliados
                </Link>
              </li>
              <li>
                <Link href="/aviso-precos" className="hover:text-foreground">
                  Aviso de preços
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Radar Milhas &amp; Viagens não é uma agência de viagens e não emite passagens. Preços
            e disponibilidade podem mudar — sempre confirme no site oficial antes de comprar.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Radar Milhas &amp; Viagens. Todos os direitos reservados.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Desenvolvido por Cortex Tech — CNPJ 65.135.861/0001-22.
          </p>
        </div>
      </div>
    </footer>
  );
}
