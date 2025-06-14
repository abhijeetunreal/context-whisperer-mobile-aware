
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
}

export const useTextToSpeech = ({ voiceId = '9BWtsMINqrJLrRacOk9x', apiKey }: TextToSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const environmentStateRef = useRef<EnvironmentState>({
    lastDescription: '',
    lastObjects: [],
    lastEnvironmentType: '',
    lastSpokenTime: 0
  });

  const generateChangeDescription = useCallback((currentContext: string, currentObjects: string[], reasoning: string): string => {
    const now = Date.now();
    const timeSinceLastSpoken = now - environmentStateRef.current.lastSpokenTime;
    const previousObjects = environmentStateRef.current.lastObjects;
    const previousEnvironment = environmentStateRef.current.lastEnvironmentType;
    
    // Detect new objects that weren't there before
    const newObjects = currentObjects.filter(obj => !previousObjects.includes(obj));
    const removedObjects = previousObjects.filter(obj => !currentObjects.includes(obj));
    
    // Determine environment type from context
    let currentEnvironmentType = 'general';
    if (currentContext.toLowerCase().includes('kitchen')) currentEnvironmentType = 'kitchen';
    else if (currentContext.toLowerCase().includes('office') || currentContext.toLowerCase().includes('workspace')) currentEnvironmentType = 'office';
    else if (currentContext.toLowerCase().includes('outdoor') || currentContext.toLowerCase().includes('street')) currentEnvironmentType = 'outdoor';
    else if (currentContext.toLowerCase().includes('room') || currentContext.toLowerCase().includes('indoor')) currentEnvironmentType = 'indoor';
    else if (currentContext.toLowerCase().includes('vehicle') || currentContext.toLowerCase().includes('car')) currentEnvironmentType = 'vehicle';
    
    // Environment change detection
    const environmentChanged = currentEnvironmentType !== previousEnvironment && previousEnvironment !== '';
    
    let description = '';
    
    // If environment changed significantly
    if (environmentChanged) {
      switch (currentEnvironmentType) {
        case 'kitchen':
          description = "I can see we've moved to a kitchen area. ";
          break;
        case 'office':
          description = "We're now in what appears to be a workspace or office environment. ";
          break;
        case 'outdoor':
          description = "The view has changed to an outdoor setting. ";
          break;
        case 'indoor':
          description = "We've moved to an indoor space. ";
          break;
        case 'vehicle':
          description = "I can see we're now in or near a vehicle. ";
          break;
        default:
          description = "The environment around us has changed. ";
      }
    }
    
    // Describe new objects in natural language
    if (newObjects.length > 0) {
      if (newObjects.length === 1) {
        const obj = newObjects[0];
        if (obj === 'person') {
          description += "Someone has come into view. ";
        } else if (['car', 'truck', 'bus', 'motorcycle'].includes(obj)) {
          description += `A ${obj} has appeared in the scene. `;
        } else if (['cat', 'dog', 'bird'].includes(obj)) {
          description += `I can now see a ${obj} nearby. `;
        } else {
          description += `There's now a ${obj} visible. `;
        }
      } else if (newObjects.length <= 3) {
        const lastObj = newObjects.pop();
        description += `I can now see ${newObjects.join(', ')} and ${lastObj}. `;
      } else {
        description += `Several new objects have come into view including ${newObjects.slice(0, 2).join(' and ')}. `;
      }
    }
    
    // Describe what's no longer visible
    if (removedObjects.length > 0 && removedObjects.length <= 2) {
      if (removedObjects.includes('person')) {
        description += "The person has moved out of view. ";
      } else if (removedObjects.length === 1) {
        description += `The ${removedObjects[0]} is no longer visible. `;
      } else {
        description += `The ${removedObjects.join(' and ')} have moved out of sight. `;
      }
    }
    
    // Add contextual reasoning if there's movement or interaction
    if (reasoning.includes('motion') || reasoning.includes('moving')) {
      if (reasoning.includes('person')) {
        description += "There's someone moving around. ";
      } else if (reasoning.includes('vehicle')) {
        description += "I can see vehicle movement. ";
      } else {
        description += "There's some movement in the scene. ";
      }
    }
    
    // If nothing significant changed but enough time has passed, give a brief update
    if (!description && timeSinceLastSpoken > 10000 && currentObjects.length > 0) {
      const dominantObjects = currentObjects.slice(0, 2);
      if (dominantObjects.includes('person')) {
        description = "I can still see people in the area. ";
      } else if (dominantObjects.some(obj => ['car', 'truck', 'bus'].includes(obj))) {
        description = "Vehicles remain in view. ";
      } else {
        description = `The scene continues to show ${dominantObjects[0]}${dominantObjects.length > 1 ? ' and other objects' : ''}. `;
      }
    }
    
    // Update tracking state
    environmentStateRef.current = {
      lastDescription: description,
      lastObjects: [...currentObjects],
      lastEnvironmentType: currentEnvironmentType,
      lastSpokenTime: now
    };
    
    return description.trim() || "Monitoring the environment for changes.";
  }, []);

  const speak = useCallback(async (text: string, currentObjects?: string[], reasoning?: string) => {
    if (!text || text.trim() === '') {
      console.log('🎤 No text provided for speech');
      return;
    }

    // Process text for change detection if objects and reasoning are provided
    let processedText = text;
    if (currentObjects && reasoning) {
      processedText = generateChangeDescription(text, currentObjects, reasoning);
    }

    // Skip if the same content was just spoken
    if (processedText === environmentStateRef.current.lastDescription && 
        Date.now() - environmentStateRef.current.lastSpokenTime < 5000) {
      console.log('🎤 Same content recently spoken, skipping...');
      return;
    }

    console.log('🎤 Starting natural voice description:', processedText.substring(0, 100) + '...');
    setError(null);

    // Stop any ongoing speech first
    if (speechSynthesis.speaking) {
      console.log('🎤 Stopping ongoing speech');
      speechSynthesis.cancel();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsSpeaking(true);

    try {
      const utterance = new SpeechSynthesisUtterance(processedText);
      
      // Configure speech settings for natural delivery
      utterance.rate = 0.85;
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
      
      // Select natural-sounding voice
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
        console.log('🎤 Natural speech started');
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        console.log('🎤 Natural speech completed');
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('🎤 Speech error:', event.error);
        setIsSpeaking(false);
        setError(`Speech error: ${event.error}`);
      };
      
      // Start speaking
      console.log('🎤 Starting natural speech synthesis...');
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
  }, [isSpeaking, generateChangeDescription]);

  const stop = useCallback(() => {
    console.log('🎤 Stopping speech manually');
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const resetEnvironmentState = useCallback(() => {
    environmentStateRef.current = {
      lastDescription: '',
      lastObjects: [],
      lastEnvironmentType: '',
      lastSpokenTime: 0
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
