'use client';

import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Send, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { askConsultant, type ChatMessage } from './actions';

const SUGGESTED_QUESTIONS = [
  'Tenho X pontos, para onde consigo viajar barato em dezembro?',
  'Vale a pena transferir com bônus de 80%?',
  'Qual a melhor estratégia para viajar para Portugal?',
  'Devo esperar uma promoção ou comprar agora?',
];

export function ConsultorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setLoading(true);

    try {
      const result = await askConsultant(messages, trimmed);
      if (result.error || !result.reply) {
        setError(result.error || 'Não foi possível obter uma resposta agora. Tente novamente.');
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.reply as string }]);
      }
    } catch {
      setError('Não foi possível obter uma resposta agora. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          As respostas são geradas por IA e não garantem disponibilidade ou preço — sempre confirme antes de
          comprar.
        </p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">Pergunte sobre pontos, milhas e sua próxima viagem</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Escolha uma sugestão abaixo ou digite sua pergunta.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <Button
                      key={q}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => sendMessage(q)}
                      disabled={loading}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Pensando...
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t pt-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre pontos, milhas, transferências ou destinos..."
              className="min-h-[44px] flex-1 resize-none"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
