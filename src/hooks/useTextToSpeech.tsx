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
    lastTextDetection: 0
  });

  const generateSmartDescription = useCallback((currentContext: string, currentObjects: string[], reasoning: string, hasTextDetected?: boolean, detectedTextContent?: string): string => {
    const now = Date.now();
    const timeSinceLastSpoken = now - environmentStateRef.current.lastSpokenTime;
    const timeSinceLastChange = now - environmentStateRef.current.lastSignificantChange;
    const timeSinceLastText = now - environmentStateRef.current.lastTextDetection;
    const previousObjects = environmentStateRef.current.lastObjects;
    const previousEnvironment = environmentStateRef.current.lastEnvironmentType;
    
    // Prioritize text detection with actual content - only speak if text was recently detected
    if (hasTextDetected && timeSinceLastText > 5000) {
      let textDescription = '';
      
      if (detectedTextContent && detectedTextContent.trim() !== '') {
        // Read the actual detected text
        if (detectedTextContent.includes('Large text detected')) {
          textDescription = "Large text visible on screen";
        } else if (detectedTextContent.includes('Medium text detected')) {
          textDescription = "Medium size text visible";
        } else if (detectedTextContent.includes('Text detected')) {
          textDescription = "Text is visible";
        } else {
          // If we have actual text content, read it
          textDescription = `Text says: ${detectedTextContent}`;
        }
      } else {
        textDescription = "Text is visible on screen";
      }
      
      environmentStateRef.current.lastTextDetection = now;
      environmentStateRef.current.lastSpokenTime = now;
      return textDescription;
    }
    
    // If text is detected, skip other descriptions
    if (hasTextDetected) {
      return '';
    }
    
    // Detect significant changes
    const newObjects = currentObjects.filter(obj => !previousObjects.includes(obj));
    const removedObjects = previousObjects.filter(obj => !currentObjects.includes(obj));
    const hasSignificantChange = newObjects.length > 0 || removedObjects.length > 0;
    
    // Determine environment type
    let currentEnvironmentType = 'general';
    if (currentContext.toLowerCase().includes('kitchen')) currentEnvironmentType = 'kitchen';
    else if (currentContext.toLowerCase().includes('office')) currentEnvironmentType = 'office';
    else if (currentContext.toLowerCase().includes('outdoor')) currentEnvironmentType = 'outdoor';
    else if (currentContext.toLowerCase().includes('room')) currentEnvironmentType = 'indoor';
    else if (currentContext.toLowerCase().includes('vehicle')) currentEnvironmentType = 'vehicle';
    
    const environmentChanged = currentEnvironmentType !== previousEnvironment && previousEnvironment !== '';
    
    let description = '';
    
    // Only speak if there's a significant change or enough time has passed
    if (!hasSignificantChange && !environmentChanged && timeSinceLastSpoken < 15000) {
      return ''; // Skip repetitive descriptions
    }
    
    // Environment transitions
    if (environmentChanged) {
      switch (currentEnvironmentType) {
        case 'kitchen':
          description = "Kitchen area detected. ";
          break;
        case 'office':
          description = "Workspace environment detected. ";
          break;
        case 'outdoor':
          description = "Outdoor environment detected. ";
          break;
        case 'indoor':
          description = "Indoor space detected. ";
          break;
        case 'vehicle':
          description = "Vehicle detected. ";
          break;
      }
      environmentStateRef.current.lastSignificantChange = now;
    }
    
    // New objects detection
    if (newObjects.length > 0) {
      if (newObjects.length === 1) {
        const obj = newObjects[0];
        if (obj === 'person') {
          description += "Person detected. ";
        } else if (['car', 'truck', 'bus'].includes(obj)) {
          description += `${obj} detected. `;
        } else if (['cat', 'dog', 'bird'].includes(obj)) {
          description += `${obj} detected. `;
        } else {
          description += `${obj} detected. `;
        }
      } else if (newObjects.length <= 3) {
        description += `Multiple objects detected: ${newObjects.slice(0, 2).join(', ')}. `;
      }
      environmentStateRef.current.lastSignificantChange = now;
    }
    
    // Avoid repetitive fallback phrases
    if (!description && timeSinceLastChange > 25000 && currentObjects.length > 0) {
      const dominantObjects = currentObjects.slice(0, 2);
      if (dominantObjects.includes('person')) {
        description = "Person in view. ";
      } else if (dominantObjects.some(obj => ['car', 'truck', 'bus'].includes(obj))) {
        description = "Vehicle in view. ";
      } else if (dominantObjects.length > 0) {
        description = `${dominantObjects[0]} detected. `;
      }
    }
    
    // Check against recently spoken phrases to avoid repetition
    const trimmedDescription = description.trim();
    if (trimmedDescription && !environmentStateRef.current.spokenPhrases.has(trimmedDescription)) {
      environmentStateRef.current.spokenPhrases.add(trimmedDescription);
      
      // Clear old phrases periodically
      if (environmentStateRef.current.spokenPhrases.size > 8) {
        environmentStateRef.current.spokenPhrases.clear();
      }
    } else if (environmentStateRef.current.spokenPhrases.has(trimmedDescription)) {
      return ''; // Skip if recently spoken
    }
    
    // Update state
    environmentStateRef.current = {
      ...environmentStateRef.current,
      lastDescription: trimmedDescription,
      lastObjects: [...currentObjects],
      lastEnvironmentType: currentEnvironmentType,
      lastSpokenTime: now
    };
    
    return trimmedDescription;
  }, []);

  const speak = useCallback(async (text: string, currentObjects?: string[], reasoning?: string, hasTextDetected?: boolean, detectedTextContent?: string) => {
    if (!text || text.trim() === '') {
      return;
    }

    // Generate smart description that avoids repetition
    let processedText = text;
    if (currentObjects && reasoning !== undefined) {
      processedText = generateSmartDescription(text, currentObjects, reasoning, hasTextDetected, detectedTextContent);
    }

    // Skip if no meaningful content to speak
    if (!processedText || processedText.trim() === '') {
      return;
    }

    console.log('🎤 Speaking:', processedText);
    setError(null);

    // Stop any ongoing speech
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      // Configure for natural speech
      utterance.rate = 0.85; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Get available voices
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
      
      // Select best available voice
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
      
      // Event handlers
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
  }, [generateSmartDescription]);

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
      lastTextDetection: 0
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
