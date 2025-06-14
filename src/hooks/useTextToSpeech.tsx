import { useState, useCallback, useRef } from 'react';

interface TextToSpeechOptions {
  voiceId?: string;
  apiKey?: string;
}

interface EnvironmentState {
  lastDescription: string;
  lastObjects: string[];
  lastEnvironmentType: string;
  lastSpokenTime: number;
  spokenPhrases: Set<string>;
  lastSignificantChange: number;
  lastTextDetection: number;
  lastSpokenText: string;
}

export const useTextToSpeech = ({ voiceId = '9BWtsMINqrJLrRacOk9x', apiKey }: TextToSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const environmentStateRef = useRef<EnvironmentState>({
    lastDescription: '',
    lastObjects: [],
    lastEnvironmentType: '',
    lastSpokenTime: 0,
    spokenPhrases: new Set(),
    lastSignificantChange: 0,
    lastTextDetection: 0,
    lastSpokenText: ''
  });

  const generateNaturalDescription = useCallback((currentContext: string, currentObjects: string[], reasoning: string, hasTextDetected?: boolean, detectedTextContent?: string): string => {
    const now = Date.now();
    const timeSinceLastSpoken = now - environmentStateRef.current.lastSpokenTime;
    const timeSinceLastChange = now - environmentStateRef.current.lastSignificantChange;
    const timeSinceLastText = now - environmentStateRef.current.lastTextDetection;
    const previousObjects = environmentStateRef.current.lastObjects;
    
    // Prioritize actual text content - only speak if there's readable text
    if (hasTextDetected && detectedTextContent && detectedTextContent.trim() !== '') {
      // Avoid repeating the same text
      if (detectedTextContent === environmentStateRef.current.lastSpokenText && timeSinceLastText < 8000) {
        return '';
      }
      
      // Only speak actual readable text content, not descriptions
      if (!detectedTextContent.includes('detected') && !detectedTextContent.includes('region')) {
        environmentStateRef.current.lastTextDetection = now;
        environmentStateRef.current.lastSpokenTime = now;
        environmentStateRef.current.lastSpokenText = detectedTextContent;
        return detectedTextContent; // Speak the actual text content
      }
    }
    
    // Skip environment descriptions if text is detected
    if (hasTextDetected) {
      return '';
    }
    
    // Natural environment descriptions
    const newObjects = currentObjects.filter(obj => !previousObjects.includes(obj));
    const hasSignificantChange = newObjects.length > 0;
    
    // Determine environment naturally
    let environmentDescription = '';
    if (currentContext.toLowerCase().includes('kitchen')) {
      environmentDescription = 'You appear to be in a kitchen area';
    } else if (currentContext.toLowerCase().includes('office')) {
      environmentDescription = 'This looks like an office or workspace';
    } else if (currentContext.toLowerCase().includes('outdoor')) {
      environmentDescription = 'You are in an outdoor environment';
    } else if (currentContext.toLowerCase().includes('bedroom') || currentContext.toLowerCase().includes('living')) {
      environmentDescription = 'This appears to be a living space';
    } else if (currentContext.toLowerCase().includes('vehicle') || currentContext.toLowerCase().includes('car')) {
      environmentDescription = 'You are inside a vehicle';
    }
    
    // Only speak if there's a significant change or enough time has passed
    if (!hasSignificantChange && timeSinceLastSpoken < 20000) {
      return '';
    }
    
    let description = '';
    
    // Natural object descriptions
    if (newObjects.length > 0) {
      const person = newObjects.find(obj => obj === 'person');
      const vehicles = newObjects.filter(obj => ['car', 'truck', 'bus', 'motorcycle'].includes(obj));
      const animals = newObjects.filter(obj => ['cat', 'dog', 'bird'].includes(obj));
      const furniture = newObjects.filter(obj => ['chair', 'table', 'couch', 'bed'].includes(obj));
      
      if (person) {
        description = 'There is someone nearby';
      } else if (vehicles.length > 0) {
        description = vehicles.length === 1 ? `A ${vehicles[0]} is visible` : 'Vehicles are in the area';
      } else if (animals.length > 0) {
        description = animals.length === 1 ? `I can see a ${animals[0]}` : 'Animals are present';
      } else if (furniture.length > 0) {
        description = 'Furniture is visible in the room';
      } else if (newObjects.length === 1) {
        description = `I can see a ${newObjects[0]}`;
      }
      
      environmentStateRef.current.lastSignificantChange = now;
    }
    
    // Add environment context naturally
    if (environmentDescription && timeSinceLastChange > 30000) {
      if (description) {
        description = `${environmentDescription}. ${description}`;
      } else {
        description = environmentDescription;
      }
    }
    
    // Avoid repetitive phrases
    const trimmedDescription = description.trim();
    if (trimmedDescription && !environmentStateRef.current.spokenPhrases.has(trimmedDescription)) {
      environmentStateRef.current.spokenPhrases.add(trimmedDescription);
      
      // Clear old phrases periodically
      if (environmentStateRef.current.spokenPhrases.size > 6) {
        environmentStateRef.current.spokenPhrases.clear();
      }
    } else if (environmentStateRef.current.spokenPhrases.has(trimmedDescription)) {
      return '';
    }
    
    // Update state
    environmentStateRef.current = {
      ...environmentStateRef.current,
      lastDescription: trimmedDescription,
      lastObjects: [...currentObjects],
      lastSpokenTime: now
    };
    
    return trimmedDescription;
  }, []);

  const speak = useCallback(async (text: string, currentObjects?: string[], reasoning?: string, hasTextDetected?: boolean, detectedTextContent?: string) => {
    if (!text || text.trim() === '') {
      return;
    }

    let processedText = text;
    if (currentObjects && reasoning !== undefined) {
      processedText = generateNaturalDescription(text, currentObjects, reasoning, hasTextDetected, detectedTextContent);
    }

    if (!processedText || processedText.trim() === '') {
      return;
    }

    console.log('🎤 Speaking:', processedText);
    setError(null);

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      let voices = speechSynthesis.getVoices();
      
      if (voices.length === 0) {
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
      
      if (voices.length > 0) {
        const preferredVoice = 
          voices.find(voice => voice.name.toLowerCase().includes('karen')) ||
          voices.find(voice => voice.name.toLowerCase().includes('samantha')) ||
          voices.find(voice => voice.lang.startsWith('en-US') && voice.name.toLowerCase().includes('female')) ||
          voices.find(voice => voice.lang.startsWith('en-US')) ||
          voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('🎤 Speech error:', event.error);
        setIsSpeaking(false);
        setError(`Speech error: ${event.error}`);
      };
      
      speechSynthesis.speak(utterance);
      
    } catch (err) {
      console.error('🎤 Speech setup error:', err);
      setError(err instanceof Error ? err.message : 'Speech synthesis failed');
      setIsSpeaking(false);
    }
  }, [generateNaturalDescription]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const resetEnvironmentState = useCallback(() => {
    environmentStateRef.current = {
      lastDescription: '',
      lastObjects: [],
      lastEnvironmentType: '',
      lastSpokenTime: 0,
      spokenPhrases: new Set(),
      lastSignificantChange: 0,
      lastTextDetection: 0,
      lastSpokenText: ''
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    error,
    resetEnvironmentState,
  };
};
