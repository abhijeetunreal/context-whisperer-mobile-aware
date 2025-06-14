
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

    console.log('Speaking text:', text.substring(0, 50) + '...');
    setError(null);

    if (!apiKey) {
      console.log('Using browser speech synthesis');
      try {
        // Stop any ongoing speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        
        utterance.onstart = () => {
          console.log('Browser speech started');
          setIsSpeaking(true);
        };
        utterance.onend = () => {
          console.log('Browser speech ended');
          setIsSpeaking(false);
        };
        utterance.onerror = (event) => {
          console.error('Browser speech error:', event);
          setIsSpeaking(false);
          setError('Speech synthesis failed');
        };
        
        speechSynthesis.speak(utterance);
      } catch (err) {
        console.error('Browser speech synthesis error:', err);
        setError('Browser speech not supported');
      }
      return;
    }

    try {
      setIsSpeaking(true);

      console.log('Using ElevenLabs API...');
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
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.oncanplaythrough = () => {
        console.log('ElevenLabs audio ready to play');
      };
      
      audio.onended = () => {
        console.log('ElevenLabs audio ended');
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (event) => {
        console.error('ElevenLabs audio playback error:', event);
        setIsSpeaking(false);
        setError('Audio playback failed');
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      console.log('ElevenLabs audio playing');
    } catch (err) {
      console.error('ElevenLabs TTS error:', err);
      setIsSpeaking(false);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to browser speech
      console.log('Falling back to browser speech synthesis');
      try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      } catch (fallbackErr) {
        console.error('Fallback speech also failed:', fallbackErr);
      }
    }
  }, [apiKey, voiceId]);

  const stop = useCallback(() => {
    console.log('Stopping speech');
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
