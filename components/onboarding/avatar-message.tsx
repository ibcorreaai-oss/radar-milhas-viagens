'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvatarMessageProps {
  text: string;
  // Preferência de "falar em voz alta" — fica no estado do wizard (não
  // local a este componente) pra que, uma vez ligada pelo usuário, valha
  // pra todas as telas seguintes sem precisar clicar de novo em cada uma.
  autoSpeak: boolean;
  onAutoSpeakChange: (value: boolean) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

// Texto com efeito de "digitando" + leitura em voz alta opcional (Web
// Speech API — nativa do navegador, zero custo de API nova, ver
// [[feedback_gasto_zero_api_novas]]). ETAPA 18: "vai explicar com o texto
// e vai ficar falando também, pra quem não quiser ler". Áudio nunca começa
// sozinho no carregamento da página (autoSpeak começa false — alguns
// navegadores bloqueiam/estranham síntese de voz sem gesto do usuário, e é
// mais respeitoso já começar mudo); depois do primeiro clique em "Ouvir",
// continua ligado nas próximas telas até o usuário desligar.
export function AvatarMessage({ text, autoSpeak, onAutoSpeakChange, onSpeakingChange }: AvatarMessageProps) {
  const [displayed, setDisplayed] = useState('');
  const [ttsAvailable, setTtsAvailable] = useState(false);

  useEffect(() => {
    setTtsAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  useEffect(() => {
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setDisplayed(text);
      return;
    }

    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 16);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    if (!ttsAvailable) return;

    window.speechSynthesis.cancel();
    onSpeakingChange?.(false);
    if (!autoSpeak) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.onstart = () => onSpeakingChange?.(true);
    utterance.onend = () => onSpeakingChange?.(false);
    utterance.onerror = () => onSpeakingChange?.(false);
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      onSpeakingChange?.(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoSpeak, ttsAvailable]);

  return (
    <div className="space-y-2">
      {/* ETAPA 19 (auditoria de acessibilidade pré-deploy): o texto que
          "digita" progressivamente (aria-hidden, só efeito visual) some/
          aparece via setInterval sem aria-live — leitor de tela geralmente
          não anuncia isso. O texto completo fica disponível de imediato
          num nó .sr-only paralelo, exatamente o conteúdo que a Rada
          deveria "explicar" pra quem usa leitor de tela. */}
      <p aria-hidden="true" className="min-h-[4.5rem] text-base leading-relaxed text-foreground sm:text-lg">
        {displayed}
      </p>
      <p className="sr-only">{text}</p>
      {ttsAvailable && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-pressed={autoSpeak}
          className="gap-1.5 text-muted-foreground"
          onClick={() => onAutoSpeakChange(!autoSpeak)}
        >
          {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {autoSpeak ? 'Lendo em voz alta' : 'Ouvir em voz alta'}
        </Button>
      )}
    </div>
  );
}
