import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'Contato',
  description:
    'Fale com o Radar Milhas & Viagens — tire dúvidas, envie sugestões ou relate um problema.',
  alternates: { canonical: '/contato' },
};

export default function ContatoPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm font-medium text-primary">Fale com a gente</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Contato</h1>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          Tem uma dúvida, sugestão ou encontrou algum problema? Envie uma mensagem — a gente lê e
          responde de verdade.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Envie sua mensagem
            </CardTitle>
            <CardDescription>Respondemos pelo e-mail que você informar abaixo.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactForm />
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </>
  );
}
