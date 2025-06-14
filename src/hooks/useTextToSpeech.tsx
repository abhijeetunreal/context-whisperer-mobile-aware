
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
    lastSignificantChange: 0
  });

  const detectTextInImage = useCallback(async (videoElement: HTMLVideoElement): Promise<string[]> => {
    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      // Simple text detection using image analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Look for text-like patterns (high contrast edges, horizontal/vertical lines)
      let textRegions = 0;
      let highContrastPixels = 0;
      
      for (let i = 0; i < data.length; i += 16) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const nextBrightness = (data[i + 4] + data[i + 5] + data[i + 6]) / 3;
        const contrast = Math.abs(brightness - nextBrightness);
        
        if (contrast > 50) {
          highContrastPixels++;
        }
      }
      
      // If significant text-like patterns detected
      if (highContrastPixels > canvas.width * canvas.height * 0.02) {
        textRegions++;
        return ['text detected in image'];
      }
      
      return [];
    } catch (error) {
      console.error('Text detection error:', error);
      return [];
    }
  }, []);

  const generateSmartDescription = useCallback((currentContext: string, currentObjects: string[], reasoning: string, detectedText?: string[]): string => {
    const now = Date.now();
    const timeSinceLastSpoken = now - environmentStateRef.current.lastSpokenTime;
    const timeSinceLastChange = now - environmentStateRef.current.lastSignificantChange;
    const previousObjects = environmentStateRef.current.lastObjects;
    const previousEnvironment = environmentStateRef.current.lastEnvironmentType;
    
    // If text is detected, prioritize text description
    if (detectedText && detectedText.length > 0) {
      const textDescription = "I can see text or writing in the view.";
      if (!environmentStateRef.current.spokenPhrases.has(textDescription) || timeSinceLastSpoken > 15000) {
        environmentStateRef.current.spokenPhrases.add(textDescription);
        return textDescription;
      }
      return ''; // Skip if text description was recently spoken
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
    if (!hasSignificantChange && !environmentChanged && timeSinceLastSpoken < 12000) {
      return ''; // Skip repetitive descriptions
    }
    
    // Environment transitions
    if (environmentChanged) {
      switch (currentEnvironmentType) {
        case 'kitchen':
          description = "Moved to a kitchen area. ";
          break;
        case 'office':
          description = "Now in a workspace environment. ";
          break;
        case 'outdoor':
          description = "View changed to outdoors. ";
          break;
        case 'indoor':
          description = "Moved to an indoor space. ";
          break;
        case 'vehicle':
          description = "Now in or near a vehicle. ";
          break;
      }
      environmentStateRef.current.lastSignificantChange = now;
    }
    
    // New objects detection
    if (newObjects.length > 0) {
      if (newObjects.length === 1) {
        const obj = newObjects[0];
        if (obj === 'person') {
          description += "Someone appeared in view. ";
        } else if (['car', 'truck', 'bus'].includes(obj)) {
          description += `A ${obj} came into sight. `;
        } else if (['cat', 'dog', 'bird'].includes(obj)) {
          description += `A ${obj} is now visible. `;
        } else {
          description += `${obj} appeared. `;
        }
      } else if (newObjects.length <= 3) {
        description += `New objects: ${newObjects.slice(0, 2).join(', ')}${newObjects.length > 2 ? ' and more' : ''}. `;
      }
      environmentStateRef.current.lastSignificantChange = now;
    }
    
    // Movement detection
    if (reasoning.includes('motion') || reasoning.includes('moving')) {
      if (reasoning.includes('person') && !description.includes('Someone')) {
        description += "Movement detected. ";
      } else if (reasoning.includes('vehicle') && !description.includes('vehicle')) {
        description += "Vehicle movement. ";
      }
    }
    
    // Avoid repetitive fallback phrases
    if (!description && timeSinceLastChange > 20000 && currentObjects.length > 0) {
      const dominantObjects = currentObjects.slice(0, 2);
      if (dominantObjects.includes('person')) {
        description = "People present in the area. ";
      } else if (dominantObjects.some(obj => ['car', 'truck', 'bus'].includes(obj))) {
        description = "Vehicles in view. ";
      } else if (dominantObjects.length > 0) {
        description = `Scene shows ${dominantObjects[0]}${dominantObjects.length > 1 ? ' and other items' : ''}. `;
      }
    }
    
    // Check against recently spoken phrases
    const trimmedDescription = description.trim();
    if (trimmedDescription && !environmentStateRef.current.spokenPhrases.has(trimmedDescription)) {
      environmentStateRef.current.spokenPhrases.add(trimmedDescription);
      
      // Clear old phrases periodically
      if (environmentStateRef.current.spokenPhrases.size > 10) {
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

  const speak = useCallback(async (text: string, currentObjects?: string[], reasoning?: string, videoElement?: HTMLVideoElement) => {
    if (!text || text.trim() === '') {
      return;
    }

    // Detect text in image if video element is provided
    let detectedText: string[] = [];
    if (videoElement) {
      detectedText = await detectTextInImage(videoElement);
    }

    // Generate smart description that avoids repetition
    let processedText = text;
    if (currentObjects && reasoning) {
      processedText = generateSmartDescription(text, currentObjects, reasoning, detectedText);
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
      utterance.rate = 0.9;
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
  }, [generateSmartDescription, detectTextInImage]);

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
      lastSignificantChange: 0
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
