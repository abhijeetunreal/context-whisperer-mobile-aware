
import { useState, useCallback } from 'react';

interface TextToSpeechOptions {
  voiceId?: string;
  apiKey?: string;
}

export const useTextToSpeech = ({ voiceId = '9BWtsMINqrJLrRacOk9x', apiKey }: TextToSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speak = useCallback(async (text: string) => {
    if (!text || text.trim() === '') {
      console.log('No text provided for speech');
      return;
    }

    // Stop any ongoing speech first
    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    console.log('Speaking text:', text);
    setError(null);
    setIsSpeaking(true);

    // Always use browser speech for reliability
    try {
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      
      // Wait for voices to load
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Prefer female voice for accessibility
        const preferredVoice = voices.find(voice => 
          voice.name.toLowerCase().includes('female') || 
          voice.name.toLowerCase().includes('samantha') ||
          voice.name.toLowerCase().includes('karen')
        ) || voices[0];
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => {
        console.log('Voice description started');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('Voice description completed');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setError('Voice synthesis failed');
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (err) {
      console.error('Speech synthesis error:', err);
      setError('Voice system not available');
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    console.log('Stopping voice description');
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
