
import { useState, useCallback } from 'react';

interface TextToSpeechOptions {
  voiceId?: string;
  apiKey?: string;
}

export const useTextToSpeech = ({ voiceId = '9BWtsMINqrJLrRacOk9x', apiKey }: TextToSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!apiKey) {
      console.warn('ElevenLabs API key not provided, using browser speech synthesis');
      // Fallback to browser's built-in speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => {
        setIsSpeaking(false);
        setError('Speech synthesis failed');
      };
      
      speechSynthesis.speak(utterance);
      return;
    }

    try {
      setIsSpeaking(true);
      setError(null);

      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voiceId, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Text-to-speech error:', err);
    }
  }, [apiKey, voiceId]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    error,
  };
};
