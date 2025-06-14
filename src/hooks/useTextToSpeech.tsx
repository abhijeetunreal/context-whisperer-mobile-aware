
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
      console.log('🎤 No text provided for speech');
      return;
    }

    console.log('🎤 Starting voice synthesis for:', text.substring(0, 100) + '...');
    setError(null);

    // Stop any ongoing speech first
    if (speechSynthesis.speaking) {
      console.log('🎤 Stopping ongoing speech');
      speechSynthesis.cancel();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsSpeaking(true);

    try {
      // Create utterance
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure speech settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Wait for voices to be available
      let voices = speechSynthesis.getVoices();
      
      if (voices.length === 0) {
        console.log('🎤 Waiting for voices to load...');
        await new Promise<void>((resolve) => {
          const loadVoices = () => {
            voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolve();
            } else {
              setTimeout(loadVoices, 50);
            }
          };
          speechSynthesis.addEventListener('voiceschanged', loadVoices);
          loadVoices();
        });
      }
      
      // Select best voice
      if (voices.length > 0) {
        const preferredVoice = 
          voices.find(voice => voice.name.toLowerCase().includes('karen')) ||
          voices.find(voice => voice.name.toLowerCase().includes('samantha')) ||
          voices.find(voice => voice.name.toLowerCase().includes('susan')) ||
          voices.find(voice => voice.lang.startsWith('en-US') && voice.name.toLowerCase().includes('female')) ||
          voices.find(voice => voice.lang.startsWith('en-US')) ||
          voices.find(voice => voice.lang.startsWith('en')) ||
          voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('🎤 Selected voice:', preferredVoice.name);
        }
      }
      
      // Set up event handlers
      utterance.onstart = () => {
        console.log('🎤 Speech started');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('🎤 Speech completed');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('🎤 Speech error:', event.error);
        setIsSpeaking(false);
        setError(`Speech error: ${event.error}`);
      };
      
      // Start speaking
      console.log('🎤 Starting speech synthesis...');
      speechSynthesis.speak(utterance);
      
      // Safety timeout
      setTimeout(() => {
        if (isSpeaking && !speechSynthesis.speaking) {
          console.log('🎤 Speech timeout - resetting state');
          setIsSpeaking(false);
        }
      }, 15000);
      
    } catch (err) {
      console.error('🎤 Speech setup error:', err);
      setError(err instanceof Error ? err.message : 'Speech synthesis failed');
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    console.log('🎤 Stopping speech manually');
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
