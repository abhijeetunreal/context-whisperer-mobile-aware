
import { useState, useCallback, useRef } from 'react';
import { ObjectDetector, FilesetResolver } from '@mediapipe/tasks-vision';

interface DetectedObject {
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface MotionData {
  isMotionDetected: boolean;
  motionLevel: number;
  motionDirection: string;
}

interface ObjectDetectionResult {
  objects: DetectedObject[];
  timestamp: Date;
  description: string;
  motion: MotionData;
  environmentContext: string;
}

export const useObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<ObjectDetectionResult | null>(null);
  
  const objectDetectorRef = useRef<ObjectDetector | null>(null);
  const previousFrameRef = useRef<ImageData | null>(null);

  const initializeDetector = useCallback(async () => {
    if (objectDetectorRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing enhanced MediaPipe Object Detector for small objects...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite",
          delegate: "GPU"
        },
        scoreThreshold: 0.15, // Lowered for better small object detection
        maxResults: 15, // Increased for more objects
        runningMode: "VIDEO"
      });
      
      objectDetectorRef.current = objectDetector;
      setIsReady(true);
      console.log('Enhanced MediaPipe Object Detector initialized for small objects');
    } catch (err) {
      console.error('Failed to initialize MediaPipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize object detector');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeMotion = useCallback((currentFrame: ImageData): MotionData => {
    if (!previousFrameRef.current) {
      previousFrameRef.current = currentFrame;
      return {
        isMotionDetected: false,
        motionLevel: 0,
        motionDirection: 'none'
      };
    }

    const prev = previousFrameRef.current.data;
    const curr = currentFrame.data;
    let totalDiff = 0;
    let motionPixels = 0;
    let horizontalMotion = 0;
    let verticalMotion = 0;

    // Sample every 4th pixel for performance
    for (let i = 0; i < prev.length; i += 16) {
      const prevBrightness = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      const currBrightness = (curr[i] + curr[i + 1] + curr[i + 2]) / 3;
      const diff = Math.abs(prevBrightness - currBrightness);
      
      if (diff > 15) {
        motionPixels++;
        totalDiff += diff;
        
        // Estimate motion direction based on pixel position
        const pixelIndex = i / 4;
        const width = currentFrame.width;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        if (x < width / 3) horizontalMotion -= diff;
        else if (x > (2 * width) / 3) horizontalMotion += diff;
        
        if (y < currentFrame.height / 3) verticalMotion -= diff;
        else if (y > (2 * currentFrame.height) / 3) verticalMotion += diff;
      }
    }

    const motionLevel = (totalDiff / (prev.length / 4)) * 100;
    const isMotionDetected = motionLevel > 2;
    
    let motionDirection = 'none';
    if (isMotionDetected) {
      if (Math.abs(horizontalMotion) > Math.abs(verticalMotion)) {
        motionDirection = horizontalMotion > 0 ? 'right' : 'left';
      } else if (Math.abs(verticalMotion) > 10) {
        motionDirection = verticalMotion > 0 ? 'down' : 'up';
      } else {
        motionDirection = 'general';
      }
    }

    previousFrameRef.current = currentFrame;
    
    return {
      isMotionDetected,
      motionLevel: Math.round(motionLevel * 10) / 10,
      motionDirection
    };
  }, []);

  const generateEnvironmentContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      return motion.isMotionDetected 
        ? `Environment with ${motion.motionDirection} motion detected but no clear objects visible`
        : 'Static environment with no clear objects detected';
    }

    const objectTypes = objects.map(obj => obj.name);
    const uniqueObjects = [...new Set(objectTypes)];
    const peopleCount = objectTypes.filter(type => type === 'person').length;
    const hasVehicles = objectTypes.some(type => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(type));
    const hasIndoorItems = objectTypes.some(type => ['chair', 'table', 'book', 'laptop', 'cup', 'bottle', 'phone', 'remote', 'mouse', 'keyboard'].includes(type));
    const hasOutdoorItems = objectTypes.some(type => ['tree', 'plant', 'bench', 'traffic light', 'stop sign'].includes(type));
    const hasSmallItems = objectTypes.some(type => ['cup', 'bottle', 'phone', 'book', 'remote', 'mouse', 'spoon', 'fork', 'knife'].includes(type));

    let context = '';
    
    // Environment type
    if (hasIndoorItems && !hasOutdoorItems) {
      context += 'Indoor environment ';
    } else if (hasOutdoorItems && !hasIndoorItems) {
      context += 'Outdoor environment ';
    } else if (hasVehicles) {
      context += 'Street or traffic environment ';
    } else {
      context += 'Mixed environment ';
    }

    // People and activity
    if (peopleCount > 0) {
      context += `with ${peopleCount} ${peopleCount === 1 ? 'person' : 'people'} `;
    }

    // Small items context
    if (hasSmallItems) {
      context += 'including small handheld objects ';
    }

    // Motion context
    if (motion.isMotionDetected) {
      context += `showing ${motion.motionDirection} movement `;
    } else {
      context += 'in a static scene ';
    }

    // Object summary
    if (uniqueObjects.length > 3) {
      context += `containing multiple objects including ${uniqueObjects.slice(0, 3).join(', ')} and others`;
    } else {
      context += `containing ${uniqueObjects.join(', ')}`;
    }

    return context;
  }, []);

  const detectObjects = useCallback(async (videoElement: HTMLVideoElement): Promise<ObjectDetectionResult | null> => {
    if (!objectDetectorRef.current || !isReady) {
      console.log('Object detector not ready');
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.log('Video element not ready');
      return null;
    }

    try {
      const startTimeMs = performance.now();
      const detections = objectDetectorRef.current.detectForVideo(videoElement, startTimeMs);
      
      // Get frame data for motion analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const motion = analyzeMotion(imageData);
      
      const objects: DetectedObject[] = detections.detections.map(detection => ({
        name: detection.categories[0]?.categoryName || 'unknown object',
        confidence: detection.categories[0]?.score || 0,
        boundingBox: {
          x: detection.boundingBox?.originX || 0,
          y: detection.boundingBox?.originY || 0,
          width: detection.boundingBox?.width || 0,
          height: detection.boundingBox?.height || 0
        }
      }));

      // Lower confidence threshold for small objects
      const validObjects = objects.filter(obj => obj.confidence > 0.2);
      
      const environmentContext = generateEnvironmentContext(validObjects, motion);
      
      // Enhanced description for small objects
      let description = '';
      if (validObjects.length === 0) {
        description = motion.isMotionDetected 
          ? `I detect ${motion.motionDirection} movement but no clear objects are visible`
          : 'No clear objects detected in the current view';
      } else if (validObjects.length === 1) {
        const obj = validObjects[0];
        const size = obj.boundingBox.width * obj.boundingBox.height < 0.01 ? 'small ' : '';
        description = `I can see a ${size}${obj.name} with ${Math.round(obj.confidence * 100)}% confidence`;
        if (motion.isMotionDetected) {
          description += ` with ${motion.motionDirection} motion detected`;
        }
      } else {
        const objectNames = validObjects.map(obj => obj.name);
        const uniqueObjects = [...new Set(objectNames)];
        const smallObjects = validObjects.filter(obj => obj.boundingBox.width * obj.boundingBox.height < 0.01);
        description = `I can see ${validObjects.length} objects: ${uniqueObjects.join(', ')}`;
        if (smallObjects.length > 0) {
          description += ` including ${smallObjects.length} small items`;
        }
        if (motion.isMotionDetected) {
          description += ` with ${motion.motionDirection} movement in the scene`;
        }
      }

      const result: ObjectDetectionResult = {
        objects: validObjects,
        timestamp: new Date(),
        description,
        motion,
        environmentContext
      };

      setLastDetection(result);
      console.log('Enhanced detection result with small objects:', result);
      
      return result;
    } catch (err) {
      console.error('Object detection error:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      return null;
    }
  }, [isReady, analyzeMotion, generateEnvironmentContext]);

  return {
    isLoading,
    isReady,
    error,
    lastDetection,
    initializeDetector,
    detectObjects
  };
};
