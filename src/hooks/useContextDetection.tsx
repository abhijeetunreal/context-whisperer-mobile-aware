
import { useState, useEffect, useCallback } from 'react';

interface DetectedContext {
  id: string;
  name: string;
  confidence: number;
  timestamp: Date;
}

interface ContextDetectionHook {
  detectedContext: DetectedContext | null;
  isProcessing: boolean;
  processFrame: (videoElement: HTMLVideoElement) => void;
  startDetection: () => void;
  stopDetection: () => void;
}

export const useContextDetection = (): ContextDetectionHook => {
  const [detectedContext, setDetectedContext] = useState<DetectedContext | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Simulated context detection - in real implementation, this would use ML models
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

    // Simple brightness and color analysis for context detection
    let totalBrightness = 0;
    let redSum = 0;
    let greenSum = 0;
    let blueSum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      totalBrightness += (r + g + b) / 3;
      redSum += r;
      greenSum += g;
      blueSum += b;
    }

    const pixelCount = data.length / 4;
    const avgBrightness = totalBrightness / pixelCount;
    const avgRed = redSum / pixelCount;
    const avgGreen = greenSum / pixelCount;
    const avgBlue = blueSum / pixelCount;

    // Simple heuristic-based context detection
    const contexts = [
      {
        id: 'office',
        name: 'Office Environment',
        condition: () => avgBrightness > 120 && avgBrightness < 180,
        baseConfidence: 0.85
      },
      {
        id: 'outdoor',
        name: 'Outdoor Scene',
        condition: () => avgBrightness > 150 && avgGreen > avgRed,
        baseConfidence: 0.90
      },
      {
        id: 'low-light',
        name: 'Low Light Environment',
        condition: () => avgBrightness < 80,
        baseConfidence: 0.88
      },
      {
        id: 'reading',
        name: 'Reading/Study Area',
        condition: () => avgBrightness > 100 && Math.abs(avgRed - avgGreen) < 20,
        baseConfidence: 0.82
      },
      {
        id: 'meeting',
        name: 'Meeting Room',
        condition: () => avgBrightness > 110 && avgBrightness < 160,
        baseConfidence: 0.87
      }
    ];

    // Find matching context
    for (const context of contexts) {
      if (context.condition()) {
        return {
          id: context.id,
          name: context.name,
          confidence: context.baseConfidence + (Math.random() * 0.1 - 0.05), // Add slight variation
          timestamp: new Date()
        };
      }
    }

    // Default context
    return {
      id: 'general',
      name: 'General Environment',
      confidence: 0.75,
      timestamp: new Date()
    };
  }, []);

  const processFrame = useCallback((videoElement: HTMLVideoElement) => {
    if (!videoElement || videoElement.readyState < 2) {
      return;
    }

    setIsProcessing(true);
    
    try {
      const context = analyzeFrame(videoElement);
      setDetectedContext(context);
      console.log('Context detected:', context);
    } catch (error) {
      console.error('Context detection error:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [analyzeFrame]);

  const startDetection = useCallback(() => {
    if (intervalId) return;

    const id = setInterval(() => {
      // This will be called by the component that has access to the video element
    }, 3000); // Analyze every 3 seconds

    setIntervalId(id);
  }, [intervalId]);

  const stopDetection = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setDetectedContext(null);
    setIsProcessing(false);
  }, [intervalId]);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  return {
    detectedContext,
    isProcessing,
    processFrame,
    startDetection,
    stopDetection
  };
};
