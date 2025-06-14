
import { useState, useCallback, useRef } from 'react';

interface TextDetectionResult {
  hasText: boolean;
  textRegions: Array<{
    text: string;
    confidence: number;
    boundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  lastDetectedText: string[];
}

export const useTextDetection = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<TextDetectionResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initializeTextDetection = useCallback(async () => {
    try {
      // Create canvas for text detection
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      setIsReady(true);
      console.log('Text detection initialized');
    } catch (err) {
      console.error('Text detection initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize text detection');
    }
  }, []);

  const detectText = useCallback(async (videoElement: HTMLVideoElement): Promise<TextDetectionResult | null> => {
    if (!isReady || !canvasRef.current) {
      return null;
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // Set canvas size to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw current video frame
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Enhanced text detection algorithm
      const textRegions = [];
      let totalTextPixels = 0;
      const threshold = 50; // Contrast threshold
      const minRegionSize = 100; // Minimum pixels for text region
      
      // Analyze image in blocks for text-like patterns
      const blockSize = 20;
      for (let y = 0; y < canvas.height - blockSize; y += blockSize) {
        for (let x = 0; x < canvas.width - blockSize; x += blockSize) {
          let highContrastPixels = 0;
          let horizontalEdges = 0;
          let verticalEdges = 0;
          
          // Analyze block for text characteristics
          for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
              const pixelIndex = ((y + by) * canvas.width + (x + bx)) * 4;
              if (pixelIndex >= data.length - 4) continue;
              
              const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
              
              // Check horizontal contrast (typical for text)
              if (bx < blockSize - 1) {
                const nextPixelIndex = ((y + by) * canvas.width + (x + bx + 1)) * 4;
                if (nextPixelIndex < data.length - 4) {
                  const nextBrightness = (data[nextPixelIndex] + data[nextPixelIndex + 1] + data[nextPixelIndex + 2]) / 3;
                  if (Math.abs(brightness - nextBrightness) > threshold) {
                    horizontalEdges++;
                  }
                }
              }
              
              // Check vertical contrast
              if (by < blockSize - 1) {
                const belowPixelIndex = ((y + by + 1) * canvas.width + (x + bx)) * 4;
                if (belowPixelIndex < data.length - 4) {
                  const belowBrightness = (data[belowPixelIndex] + data[belowPixelIndex + 1] + data[belowPixelIndex + 2]) / 3;
                  if (Math.abs(brightness - belowBrightness) > threshold) {
                    verticalEdges++;
                  }
                }
              }
            }
          }
          
          // Text regions typically have both horizontal and vertical edges
          const edgeRatio = horizontalEdges + verticalEdges;
          if (edgeRatio > minRegionSize * 0.3) {
            textRegions.push({
              text: `Text region detected`,
              confidence: Math.min(edgeRatio / (minRegionSize * 0.8), 1),
              boundingBox: {
                x: x,
                y: y,
                width: blockSize,
                height: blockSize
              }
            });
            totalTextPixels += edgeRatio;
          }
        }
      }
      
      // Determine if significant text is present
      const hasText = textRegions.length > 0 && totalTextPixels > canvas.width * canvas.height * 0.01;
      
      const result: TextDetectionResult = {
        hasText,
        textRegions,
        lastDetectedText: hasText ? ['Text detected in image'] : []
      };
      
      setLastDetection(result);
      
      if (hasText) {
        console.log('📝 Text detected:', textRegions.length, 'regions');
      }
      
      return result;
      
    } catch (err) {
      console.error('Text detection error:', err);
      setError(err instanceof Error ? err.message : 'Text detection failed');
      return null;
    }
  }, [isReady]);

  const resetDetection = useCallback(() => {
    setLastDetection(null);
    setError(null);
  }, []);

  return {
    isReady,
    error,
    lastDetection,
    initializeTextDetection,
    detectText,
    resetDetection
  };
};
