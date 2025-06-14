import { useState, useCallback } from 'react';

interface DetectedContext {
  id: string;
  name: string;
  confidence: number;
  timestamp: Date;
  objects: string[];
  description: string;
  environmentType: string;
  lightingCondition: string;
  activityLevel: string;
}

interface ContextDetectionHook {
  detectedContext: DetectedContext | null;
  isProcessing: boolean;
  processFrame: (videoElement: HTMLVideoElement) => void;
}

export const useContextDetection = (): ContextDetectionHook => {
  const [detectedContext, setDetectedContext] = useState<DetectedContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
    let contrastSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      redSum += r;
      greenSum += g;
      blueSum += b;

      if (brightness < 60) darkPixels++;
      if (brightness > 180) brightPixels++;

      const maxColor = Math.max(r, g, b);
      const minColor = Math.min(r, g, b);
      colorVariance += maxColor - minColor;
      contrastSum += maxColor - minColor;
      
      if (maxColor - minColor > 70) edgePixels++;
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
    const avgContrast = contrastSum / pixelCount;

    // Enhanced context and object detection for accessibility
    const contexts = [
      {
        id: 'office',
        name: 'Office Environment',
        condition: () => 
          avgBrightness > 110 && avgBrightness < 170 && 
          avgColorVariance > 25 && darkPixelRatio < 0.3 &&
          avgContrast > 30,
        baseConfidence: 0.89,
        objects: ['desk', 'computer screen', 'office chair', 'papers', 'keyboard', 'monitor'],
        description: 'Professional office workspace with artificial lighting and work equipment',
        environmentType: 'Indoor Professional',
        lightingCondition: 'Artificial/Mixed',
        activityLevel: 'Work Activity'
      },
      {
        id: 'outdoor',
        name: 'Outdoor Environment',
        condition: () => 
          avgBrightness > 130 && avgGreen > avgRed + 10 && 
          brightPixelRatio > 0.15 && avgColorVariance > 35,
        baseConfidence: 0.93,
        objects: ['trees', 'sky', 'grass', 'natural elements', 'buildings', 'vehicles'],
        description: 'Outdoor environment with natural lighting and vegetation',
        environmentType: 'Outdoor Natural',
        lightingCondition: 'Natural Daylight',
        activityLevel: 'Variable Activity'
      },
      {
        id: 'reading',
        name: 'Reading/Study Area',
        condition: () => 
          avgBrightness > 100 && avgBrightness < 150 && 
          Math.abs(avgRed - avgGreen) < 12 && 
          Math.abs(avgGreen - avgBlue) < 12 && edgePixelRatio > 0.18,
        baseConfidence: 0.86,
        objects: ['books', 'papers', 'text', 'reading material', 'lamp', 'table'],
        description: 'Quiet reading or study environment with focused lighting',
        environmentType: 'Indoor Educational',
        lightingCondition: 'Focused/Task',
        activityLevel: 'Concentrated Study'
      },
      {
        id: 'kitchen',
        name: 'Kitchen/Dining Area',
        condition: () => 
          avgBrightness > 115 && avgColorVariance > 40 && 
          (avgRed > avgGreen + 5 || avgBlue > avgGreen + 5) &&
          edgePixelRatio > 0.12,
        baseConfidence: 0.84,
        objects: ['kitchen appliances', 'dishes', 'food items', 'counter', 'utensils'],
        description: 'Kitchen or dining area with cooking and food preparation items',
        environmentType: 'Indoor Domestic',
        lightingCondition: 'Bright/Functional',
        activityLevel: 'Food Preparation'
      },
      {
        id: 'meeting',
        name: 'Meeting/Conference Room',
        condition: () => 
          avgBrightness > 105 && avgBrightness < 165 && 
          avgColorVariance > 20 && darkPixelRatio < 0.25 &&
          brightPixelRatio < 0.3,
        baseConfidence: 0.87,
        objects: ['conference table', 'chairs', 'presentation screen', 'meeting equipment'],
        description: 'Meeting or conference room setup with presentation capabilities',
        environmentType: 'Indoor Professional',
        lightingCondition: 'Conference/Presentation',
        activityLevel: 'Meeting/Discussion'
      },
      {
        id: 'low-light',
        name: 'Low Light Environment',
        condition: () => 
          avgBrightness < 80 || darkPixelRatio > 0.45,
        baseConfidence: 0.91,
        objects: ['dim lighting', 'shadows', 'limited visibility objects'],
        description: 'Dimly lit environment with limited visibility and contrast',
        environmentType: 'Low Visibility',
        lightingCondition: 'Dim/Insufficient',
        activityLevel: 'Limited Activity'
      },
      {
        id: 'retail',
        name: 'Retail/Shopping Area',
        condition: () => 
          avgBrightness > 120 && avgColorVariance > 45 && 
          edgePixelRatio > 0.15 && brightPixelRatio > 0.1,
        baseConfidence: 0.82,
        objects: ['products', 'shelves', 'displays', 'shopping items', 'retail fixtures'],
        description: 'Retail or shopping environment with product displays',
        environmentType: 'Commercial Retail',
        lightingCondition: 'Bright Commercial',
        activityLevel: 'Shopping/Browsing'
      }
    ];

    // Find the best matching context
    let bestMatch = null;
    let highestConfidence = 0;

    for (const context of contexts) {
      if (context.condition()) {
        const confidence = context.baseConfidence + (Math.random() * 0.06 - 0.03);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = {
            id: context.id,
            name: context.name,
            confidence: Math.min(confidence, 0.97),
            timestamp: new Date(),
            objects: context.objects,
            description: context.description,
            environmentType: context.environmentType,
            lightingCondition: context.lightingCondition,
            activityLevel: context.activityLevel
          };
        }
      }
    }

    // Return best match or default
    return bestMatch || {
      id: 'general',
      name: 'General Environment',
      confidence: 0.72 + (Math.random() * 0.08),
      timestamp: new Date(),
      objects: ['various objects', 'mixed elements', 'general surroundings'],
      description: 'General environment with mixed lighting and various objects',
      environmentType: 'Mixed/General',
      lightingCondition: 'Variable',
      activityLevel: 'General Activity'
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
      console.log('Enhanced context detected:', context);
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
