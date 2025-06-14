
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
      console.log('Stopping ongoing speech before starting new one');
      speechSynthesis.cancel();
      setIsSpeaking(false);
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎤 Starting voice synthesis for:', text.substring(0, 100) + '...');
    setError(null);
    setIsSpeaking(true);

    try {
      // Always use browser speech synthesis for maximum reliability
      speechSynthesis.cancel(); // Clear any pending utterances
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Enhanced speech settings for better clarity
      utterance.rate = 0.85; // Slightly slower for better comprehension
      utterance.pitch = 1.0;
      utterance.volume = 1.0; // Maximum volume
      
      // Wait for voices to be ready
      let voices = speechSynthesis.getVoices();
      
      // If voices aren't loaded yet, wait for them
      if (voices.length === 0) {
        console.log('Waiting for voices to load...');
        await new Promise<void>((resolve) => {
          const checkVoices = () => {
            voices = speechSynthesis.getVoices();
            if (voices.length > 0) {
              resolve();
            } else {
              setTimeout(checkVoices, 50);
            }
          };
          checkVoices();
        });
      }
      
      // Select the best available voice
      if (voices.length > 0) {
        console.log('Available voices:', voices.length);
        
        // Priority order for voice selection
        const preferredVoice = 
          voices.find(voice => voice.name.toLowerCase().includes('samantha')) ||
          voices.find(voice => voice.name.toLowerCase().includes('karen')) ||
          voices.find(voice => voice.name.toLowerCase().includes('susan')) ||
          voices.find(voice => voice.name.toLowerCase().includes('female')) ||
          voices.find(voice => voice.lang.includes('en-US')) ||
          voices.find(voice => voice.lang.includes('en')) ||
          voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('Selected voice:', preferredVoice.name, preferredVoice.lang);
        }
      }
      
      // Event handlers with better logging
      utterance.onstart = () => {
        console.log('✅ Voice synthesis started successfully');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('✅ Voice synthesis completed');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event.error, event);
        setIsSpeaking(false);
        setError(`Voice synthesis error: ${event.error}`);
      };
      
      utterance.onpause = () => {
        console.log('⏸️ Voice synthesis paused');
      };
      
      utterance.onresume = () => {
        console.log('▶️ Voice synthesis resumed');
      };
      
      // Start speaking
      console.log('🔊 Starting speech synthesis...');
      speechSynthesis.speak(utterance);
      
      // Fallback timeout to reset state if something goes wrong
      setTimeout(() => {
        if (isSpeaking && speechSynthesis.speaking === false) {
          console.log('⚠️ Speech synthesis timeout - resetting state');
          setIsSpeaking(false);
        }
      }, 30000); // 30 second timeout
      
    } catch (err) {
      console.error('❌ Speech synthesis setup error:', err);
      setError(err instanceof Error ? err.message : 'Voice system not available');
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const stop = useCallback(() => {
    console.log('🛑 Manually stopping voice synthesis');
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
