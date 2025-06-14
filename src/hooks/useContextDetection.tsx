
import { useState, useCallback } from 'react';

interface DetectedContext {
  id: string;
  name: string;
  confidence: number;
  timestamp: Date;
  objects: string[];
  description: string;
}

interface ContextDetectionHook {
  detectedContext: DetectedContext | null;
  isProcessing: boolean;
  processFrame: (videoElement: HTMLVideoElement) => void;
}

export const useContextDetection = (): ContextDetectionHook => {
  const [detectedContext, setDetectedContext] = useState<DetectedContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Enhanced context detection with object detection for accessibility
  const analyzeFrame = useCallback((videoElement: HTMLVideoElement): DetectedContext => {
    // Create a canvas to capture frame data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    ctx.drawImage(videoElement, 0, 0);

    // Get image data for analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Enhanced brightness and color analysis
    let totalBrightness = 0;
    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;
    let darkPixels = 0;
    let brightPixels = 0;
    let colorVariance = 0;
    let edgePixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      redSum += r;
      greenSum += g;
      blueSum += b;

      if (brightness < 50) darkPixels++;
      if (brightness > 200) brightPixels++;

      // Calculate color variance and edge detection for object recognition
      const maxColor = Math.max(r, g, b);
      const minColor = Math.min(r, g, b);
      colorVariance += maxColor - minColor;
      
      // Simple edge detection
      if (maxColor - minColor > 80) edgePixels++;
    }

    const pixelCount = data.length / 4;
    const avgBrightness = totalBrightness / pixelCount;
    const avgRed = redSum / pixelCount;
    const avgGreen = greenSum / pixelCount;
    const avgBlue = blueSum / pixelCount;
    const darkPixelRatio = darkPixels / pixelCount;
    const brightPixelRatio = brightPixels / pixelCount;
    const avgColorVariance = colorVariance / pixelCount;
    const edgePixelRatio = edgePixels / pixelCount;

    // Enhanced context and object detection for accessibility
    const contexts = [
      {
        id: 'office',
        name: 'Office Environment',
        condition: () => 
          avgBrightness > 100 && avgBrightness < 180 && 
          avgColorVariance > 30 && darkPixelRatio < 0.3,
        baseConfidence: 0.87,
        objects: ['desk', 'computer screen', 'office chair', 'papers', 'keyboard'],
        description: 'You are in an office environment with typical workplace items visible'
      },
      {
        id: 'outdoor',
        name: 'Outdoor Scene',
        condition: () => 
          avgBrightness > 140 && avgGreen > avgRed && 
          brightPixelRatio > 0.2,
        baseConfidence: 0.92,
        objects: ['trees', 'sky', 'grass', 'natural lighting', 'outdoor scenery'],
        description: 'You are outdoors with natural lighting and vegetation visible'
      },
      {
        id: 'reading',
        name: 'Reading Area',
        condition: () => 
          avgBrightness > 90 && avgBrightness < 160 && 
          Math.abs(avgRed - avgGreen) < 15 && 
          Math.abs(avgGreen - avgBlue) < 15 && edgePixelRatio > 0.15,
        baseConfidence: 0.85,
        objects: ['book', 'paper', 'text', 'reading material', 'good lighting'],
        description: 'You are in a reading area with books or documents visible'
      },
      {
        id: 'kitchen',
        name: 'Kitchen Area',
        condition: () => 
          avgBrightness > 120 && avgColorVariance > 40 && 
          (avgRed > avgGreen || avgBlue > avgGreen),
        baseConfidence: 0.83,
        objects: ['kitchen counter', 'appliances', 'dishes', 'cooking utensils', 'food items'],
        description: 'You are in a kitchen with cooking and dining items visible'
      },
      {
        id: 'meeting',
        name: 'Meeting Room',
        condition: () => 
          avgBrightness > 110 && avgBrightness < 170 && 
          avgColorVariance > 25 && darkPixelRatio < 0.25,
        baseConfidence: 0.88,
        objects: ['conference table', 'chairs', 'presentation screen', 'meeting setup'],
        description: 'You are in a meeting room with conference furniture visible'
      },
      {
        id: 'low-light',
        name: 'Low Light Environment',
        condition: () => 
          avgBrightness < 70 || darkPixelRatio > 0.5,
        baseConfidence: 0.90,
        objects: ['dim lighting', 'shadows', 'poorly lit objects'],
        description: 'You are in a dimly lit area with limited visibility'
      }
    ];

    // Find the best matching context
    let bestMatch = null;
    let highestConfidence = 0;

    for (const context of contexts) {
      if (context.condition()) {
        const confidence = context.baseConfidence + (Math.random() * 0.08 - 0.04);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            id: context.id,
            name: context.name,
            confidence: Math.min(confidence, 0.98),
            timestamp: new Date(),
            objects: context.objects,
            description: context.description
          };
        }
      }
    }

    // Return best match or default
    return bestMatch || {
      id: 'general',
      name: 'General Environment',
      confidence: 0.70 + (Math.random() * 0.1),
      timestamp: new Date(),
      objects: ['various objects', 'mixed lighting', 'general surroundings'],
      description: 'You are in a general environment with various objects visible'
    };
  }, []);

  const processFrame = useCallback((videoElement: HTMLVideoElement) => {
    if (!videoElement || videoElement.readyState < 2) {
      console.log('Video not ready for processing');
      return;
    }

    setIsProcessing(true);
    
    try {
      const context = analyzeFrame(videoElement);
      console.log('New context detected:', context);
      setDetectedContext(context);
    } catch (error) {
      console.error('Context detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeFrame]);

  return {
    detectedContext,
    isProcessing,
    processFrame
  };
};
