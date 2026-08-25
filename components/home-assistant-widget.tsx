'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { askPublicAssistant, type PublicChatMessage } from '@/app/home-chat-actions';
import { trackConversion } from '@/lib/analytics';

const LEAD_STORAGE_KEY = 'radar-milhas-lead';

interface StoredLead {
  name: string;
  email: string;
}

// ETAPA 15.1 (ver GROWTH.md) — widget flutuante da home: WhatsApp (link
// direto, sem chat embutido — não existe backend de conversa em tempo real
// neste produto, ver GROWTH.md sobre o porquê) + IA (lead-gated: nome e
// e-mail antes da primeira pergunta, guardados em localStorage pra não
// pedir de novo na mesma visita — "melhorar a captura de lead sem
// prejudicar a experiência" só funciona se não perguntar duas vezes).
export function HomeAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'lead-form' | 'chat'>('menu');
  const [lead, setLead] = useState<StoredLead | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const whatsappNumber = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEAD_STORAGE_KEY);
      if (raw) setLead(JSON.parse(raw));
    } catch {
      // Sem localStorage disponível (aba anônima, storage bloqueado) — só
      // pede nome/e-mail de novo, não quebra o widget.
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function openAiChat() {
    if (lead) {
      setMode('chat');
    } else {
      setMode('lead-form');
    }
  }

  function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;

    const newLead = { name: trimmedName, email: trimmedEmail };
    setLead(newLead);
    try {
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(newLead));
    } catch {
      // Ver comentário no useEffect acima — segue sem persistir.
    }
    trackConversion('lead');
    setMode('chat');
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading || !lead) return;

    const nextHistory: PublicChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const result = await askPublicAssistant(lead, messages, trimmed);
      if (result.error) {
        setError(result.error);
      } else if (result.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply as string }]);
      }
    } catch {
      setError('Não foi possível responder agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground">
            <span className="font-semibold">Precisa de ajuda?</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="rounded-md p-1 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {mode === 'menu' && (
            <div className="flex flex-1 flex-col justify-center gap-3 p-4">
              <p className="mb-1 text-center text-sm text-muted-foreground">
                Escolha como prefere falar com a gente:
              </p>
              <Button onClick={openAiChat} className="justify-start gap-2" size="lg">
                <Bot className="h-5 w-5" />
                Falar com o Consultor IA
              </Button>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    'Olá! Vim pelo site do Radar Milhas & Viagens e queria tirar uma dúvida.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center justify-start gap-2 rounded-md bg-[#25D366] px-4 text-sm font-medium text-white shadow transition-colors hover:bg-[#1ebd5a]"
                >
                  <MessageCircle className="h-5 w-5" />
                  Falar no WhatsApp
                </a>
              )}
            </div>
          )}

          {mode === 'lead-form' && (
            <form onSubmit={handleLeadSubmit} className="flex flex-1 flex-col justify-center gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                Antes de conversar, me diga seu nome e e-mail — é só pra podermos te avisar caso a
                conversa caia, nada de spam.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="widget-name">Nome</Label>
                <Input id="widget-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="widget-email">E-mail</Label>
                <Input
                  id="widget-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="mt-1">
                Começar a conversa
              </Button>
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-center text-xs text-muted-foreground hover:underline"
              >
                Voltar
              </button>
            </form>
          )}

          {mode === 'chat' && (
            <>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
                {messages.length === 0 && (
                  <div className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                    Oi{lead ? `, ${lead.name.split(' ')[0]}` : ''}! Pergunte o que quiser sobre como o
                    Radar Milhas & Viagens funciona, planos ou dinheiro vs pontos.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                        m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Digitando...</div>
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="flex items-end gap-2 border-t p-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(input);
                    }
                  }}
                  placeholder="Digite sua pergunta..."
                  className="min-h-[40px] flex-1 resize-none"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Enviar</span>
                </Button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
