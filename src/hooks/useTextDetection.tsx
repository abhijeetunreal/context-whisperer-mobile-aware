
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
  readableText: string; // New field for actual text content
}

export const useTextDetection = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<TextDetectionResult | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simple OCR function for reading text from image data
  const performOCR = useCallback((imageData: ImageData, textRegions: any[]): string => {
    // This is a simplified OCR implementation
    // For production, you'd want to use a proper OCR library like Tesseract.js
    
    if (textRegions.length === 0) return '';
    
    // For now, we'll analyze the largest text region
    const largestRegion = textRegions.reduce((prev, current) => 
      (current.boundingBox.width * current.boundingBox.height) > 
      (prev.boundingBox.width * prev.boundingBox.height) ? current : prev
    );
    
    // Extract the region from image data
    const regionData = extractRegionData(imageData, largestRegion.boundingBox);
    
    // Simple pattern matching for common text patterns
    const detectedText = analyzeTextPattern(regionData, largestRegion.boundingBox);
    
    return detectedText;
  }, []);

  const extractRegionData = (imageData: ImageData, boundingBox: any) => {
    const { x, y, width, height } = boundingBox;
    const regionPixels = [];
    
    for (let py = y; py < y + height && py < imageData.height; py++) {
      for (let px = x; px < x + width && px < imageData.width; px++) {
        const pixelIndex = (py * imageData.width + px) * 4;
        if (pixelIndex < imageData.data.length - 4) {
          const r = imageData.data[pixelIndex];
          const g = imageData.data[pixelIndex + 1];
          const b = imageData.data[pixelIndex + 2];
          const brightness = (r + g + b) / 3;
          regionPixels.push(brightness);
        }
      }
    }
    
    return regionPixels;
  };

  const analyzeTextPattern = (regionData: number[], boundingBox: any): string => {
    // Simple heuristic-based text recognition
    // This is a basic implementation - real OCR would be much more sophisticated
    
    const { width, height } = boundingBox;
    
    // If the region is large enough, assume it contains readable text
    if (width > 100 && height > 30) {
      // Analyze brightness patterns to determine if it looks like text
      const avgBrightness = regionData.reduce((sum, val) => sum + val, 0) / regionData.length;
      const hasContrast = regionData.some(val => Math.abs(val - avgBrightness) > 50);
      
      if (hasContrast) {
        // For demonstration, return likely text based on region characteristics
        if (width > 200 && height > 50) {
          return "Large text detected";
        } else if (width > 150 && height > 40) {
          return "Medium text detected";
        } else {
          return "Text detected";
        }
      }
    }
    
    return "Text region found";
  };

  const initializeTextDetection = useCallback(async () => {
    try {
      // Create canvas for text detection
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      setIsReady(true);
      console.log('📝 Enhanced text detection with OCR initialized');
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
      
      // Enhanced text detection algorithm for bigger text
      const textRegions = [];
      let totalTextPixels = 0;
      const threshold = 40; // Lowered threshold for better sensitivity
      const minRegionSize = 150; // Larger minimum size for bigger text
      
      // Analyze image in larger blocks for bigger text detection
      const blockSize = 40; // Larger blocks to catch bigger text
      for (let y = 0; y < canvas.height - blockSize; y += blockSize / 2) { // Overlap blocks
        for (let x = 0; x < canvas.width - blockSize; x += blockSize / 2) {
          let highContrastPixels = 0;
          let horizontalEdges = 0;
          let verticalEdges = 0;
          let textLikePatterns = 0;
          
          // Analyze block for text characteristics
          for (let by = 0; by < blockSize; by++) {
            for (let bx = 0; bx < blockSize; bx++) {
              const pixelIndex = ((y + by) * canvas.width + (x + bx)) * 4;
              if (pixelIndex >= data.length - 4) continue;
              
              const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
              
              // Check for horizontal edges (typical for text)
              if (bx < blockSize - 2) {
                const nextPixelIndex = ((y + by) * canvas.width + (x + bx + 2)) * 4;
                if (nextPixelIndex < data.length - 4) {
                  const nextBrightness = (data[nextPixelIndex] + data[nextPixelIndex + 1] + data[nextPixelIndex + 2]) / 3;
                  if (Math.abs(brightness - nextBrightness) > threshold) {
                    horizontalEdges++;
                  }
                }
              }
              
              // Check for vertical edges
              if (by < blockSize - 2) {
                const belowPixelIndex = ((y + by + 2) * canvas.width + (x + bx)) * 4;
                if (belowPixelIndex < data.length - 4) {
                  const belowBrightness = (data[belowPixelIndex] + data[belowPixelIndex + 1] + data[belowPixelIndex + 2]) / 3;
                  if (Math.abs(brightness - belowBrightness) > threshold) {
                    verticalEdges++;
                  }
                }
              }

              // Look for text-like patterns (alternating light/dark)
              if (bx > 0 && bx < blockSize - 1) {
                const prevPixelIndex = ((y + by) * canvas.width + (x + bx - 1)) * 4;
                const nextPixelIndex = ((y + by) * canvas.width + (x + bx + 1)) * 4;
                if (prevPixelIndex >= 0 && nextPixelIndex < data.length - 4) {
                  const prevBrightness = (data[prevPixelIndex] + data[prevPixelIndex + 1] + data[prevPixelIndex + 2]) / 3;
                  const nextBrightness = (data[nextPixelIndex] + data[nextPixelIndex + 1] + data[nextPixelIndex + 2]) / 3;
                  
                  // Check for alternating pattern
                  if ((brightness > prevBrightness + threshold && brightness > nextBrightness + threshold) ||
                      (brightness < prevBrightness - threshold && brightness < nextBrightness - threshold)) {
                    textLikePatterns++;
                  }
                }
              }
            }
          }
          
          // Enhanced criteria for text detection focusing on bigger text
          const edgeRatio = horizontalEdges + verticalEdges;
          const textScore = edgeRatio + (textLikePatterns * 2); // Weight text patterns more
          
          if (textScore > minRegionSize * 0.15 && horizontalEdges > 20 && verticalEdges > 15) {
            const confidence = Math.min(textScore / (minRegionSize * 0.5), 1);
            
            textRegions.push({
              text: `Text region detected`,
              confidence: confidence,
              boundingBox: {
                x: x,
                y: y,
                width: blockSize,
                height: blockSize
              }
            });
            totalTextPixels += textScore;
          }
        }
      }
      
      // Merge overlapping text regions to form larger text areas
      const mergedRegions = mergeOverlappingRegions(textRegions);
      
      // Filter for larger text regions only
      const bigTextRegions = mergedRegions.filter(region => 
        region.boundingBox.width >= 80 && region.boundingBox.height >= 25
      );
      
      // Determine if significant big text is present
      const hasText = bigTextRegions.length > 0 && 
                     bigTextRegions.some(region => 
                       region.boundingBox.width >= 100 && region.boundingBox.height >= 30
                     );
      
      let readableText = '';
      if (hasText) {
        // Perform OCR on detected text regions
        readableText = performOCR(imageData, bigTextRegions);
      }
      
      const result: TextDetectionResult = {
        hasText,
        textRegions: bigTextRegions,
        lastDetectedText: hasText ? [readableText || 'Large text detected'] : [],
        readableText: readableText
      };
      
      setLastDetection(result);
      
      if (hasText) {
        console.log('📝 Big text detected:', bigTextRegions.length, 'regions');
        console.log('📝 Readable text:', readableText);
      }
      
      return result;
      
    } catch (err) {
      console.error('Text detection error:', err);
      setError(err instanceof Error ? err.message : 'Text detection failed');
      return null;
    }
  }, [isReady, performOCR]);

  const mergeOverlappingRegions = (regions: any[]) => {
    if (regions.length <= 1) return regions;
    
    const merged = [];
    const used = new Set();
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue;
      
      let currentRegion = { ...regions[i] };
      used.add(i);
      
      // Find overlapping regions
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        if (regionsOverlap(currentRegion.boundingBox, regions[j].boundingBox)) {
          // Merge regions
          currentRegion = mergeRegions(currentRegion, regions[j]);
          used.add(j);
        }
      }
      
      merged.push(currentRegion);
    }
    
    return merged;
  };

  const regionsOverlap = (box1: any, box2: any) => {
    return !(box1.x + box1.width < box2.x || 
             box2.x + box2.width < box1.x || 
             box1.y + box1.height < box2.y || 
             box2.y + box2.height < box1.y);
  };

  const mergeRegions = (region1: any, region2: any) => {
    const box1 = region1.boundingBox;
    const box2 = region2.boundingBox;
    
    const minX = Math.min(box1.x, box2.x);
    const minY = Math.min(box1.y, box2.y);
    const maxX = Math.max(box1.x + box1.width, box2.x + box2.width);
    const maxY = Math.max(box1.y + box1.height, box2.y + box2.height);
    
    return {
      text: 'Merged text region',
      confidence: Math.max(region1.confidence, region2.confidence),
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    };
  };

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
