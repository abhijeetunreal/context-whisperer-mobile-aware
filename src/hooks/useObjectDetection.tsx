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
  const detectionHistoryRef = useRef<DetectedObject[][]>([]);

  const initializeDetector = useCallback(async () => {
    if (objectDetectorRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing enhanced MediaPipe Object Detector with improved accuracy...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      // Using EfficientDet Lite0 for better small object detection and real-time performance
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
          delegate: "GPU"
        },
        scoreThreshold: 0.1, // Lower threshold for better small object detection
        maxResults: 20, // More objects for comprehensive detection
        runningMode: "VIDEO"
      });
      
      objectDetectorRef.current = objectDetector;
      setIsReady(true);
      console.log('Enhanced MediaPipe Object Detector initialized with improved accuracy');
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

    // Improved motion detection with better sensitivity
    for (let i = 0; i < prev.length; i += 12) {
      const prevBrightness = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      const currBrightness = (curr[i] + curr[i + 1] + curr[i + 2]) / 3;
      const diff = Math.abs(prevBrightness - currBrightness);
      
      if (diff > 10) { // Lower threshold for better motion detection
        motionPixels++;
        totalDiff += diff;
        
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
    const isMotionDetected = motionLevel > 1.5; // More sensitive detection
    
    let motionDirection = 'none';
    if (isMotionDetected) {
      if (Math.abs(horizontalMotion) > Math.abs(verticalMotion)) {
        motionDirection = horizontalMotion > 0 ? 'right' : 'left';
      } else if (Math.abs(verticalMotion) > 8) {
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

  const analyzeObjectStability = useCallback((currentObjects: DetectedObject[]): DetectedObject[] => {
    // Keep history of last 3 detections for stability
    detectionHistoryRef.current.push(currentObjects);
    if (detectionHistoryRef.current.length > 3) {
      detectionHistoryRef.current.shift();
    }

    if (detectionHistoryRef.current.length < 2) {
      return currentObjects;
    }

    // Filter objects that appear consistently across frames
    const stableObjects: DetectedObject[] = [];
    
    currentObjects.forEach(obj => {
      let consistentDetections = 1;
      
      detectionHistoryRef.current.slice(0, -1).forEach(historyFrame => {
        const similarObject = historyFrame.find(histObj => 
          histObj.name === obj.name && 
          Math.abs(histObj.boundingBox.x - obj.boundingBox.x) < 0.1 &&
          Math.abs(histObj.boundingBox.y - obj.boundingBox.y) < 0.1
        );
        if (similarObject) consistentDetections++;
      });

      // Include object if detected in at least 2 out of last 3 frames
      if (consistentDetections >= 2) {
        stableObjects.push(obj);
      }
    });

    return stableObjects;
  }, []);

  const generateDetailedEnvironmentContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      return motion.isMotionDetected 
        ? `Dynamic environment with ${motion.motionDirection} motion but no distinct objects currently visible`
        : 'Static environment - no clear objects or movement detected';
    }

    const objectTypes = objects.map(obj => obj.name);
    const uniqueObjects = [...new Set(objectTypes)];
    const highConfidenceObjects = objects.filter(obj => obj.confidence > 0.4);
    const smallObjects = objects.filter(obj => obj.boundingBox.width * obj.boundingBox.height < 0.02);
    
    // Categorize objects for better context
    const people = objectTypes.filter(type => type === 'person').length;
    const vehicles = objectTypes.filter(type => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(type));
    const furniture = objectTypes.filter(type => ['chair', 'table', 'couch', 'bed'].includes(type));
    const electronics = objectTypes.filter(type => ['laptop', 'phone', 'tv', 'computer', 'monitor'].includes(type));
    const food = objectTypes.filter(type => ['cup', 'bottle', 'bowl', 'banana', 'apple', 'sandwich'].includes(type));
    const books = objectTypes.filter(type => ['book', 'newspaper'].includes(type));

    let context = '';
    
    // Activity inference
    if (people > 0) {
      context += `Social environment with ${people} ${people === 1 ? 'person' : 'people'} present. `;
    }

    if (vehicles.length > 0) {
      context += `Transportation area with ${vehicles.join(', ')} detected. `;
    } else if (furniture.length > 0 && electronics.length > 0) {
      context += `Indoor workspace or living area with furniture and technology. `;
    } else if (books.length > 0) {
      context += `Study or reading environment. `;
    } else if (food.length > 0) {
      context += `Dining or kitchen area with food items. `;
    }

    // Object detail
    if (highConfidenceObjects.length > 0) {
      context += `Clear visibility of ${highConfidenceObjects.map(obj => obj.name).join(', ')} `;
    }

    if (smallObjects.length > 0) {
      context += `including ${smallObjects.length} small detailed objects `;
    }

    // Motion context
    if (motion.isMotionDetected) {
      context += `with active ${motion.motionDirection} movement (${motion.motionLevel}% motion intensity). `;
    } else {
      context += `in a stable, stationary scene. `;
    }

    // Confidence summary
    const avgConfidence = objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length;
    context += `Detection confidence: ${Math.round(avgConfidence * 100)}%.`;

    return context;
  }, []);

  const detectObjects = useCallback(async (videoElement: HTMLVideoElement): Promise<ObjectDetectionResult | null> => {
    if (!objectDetectorRef.current || !isReady) {
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
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
      
      const rawObjects: DetectedObject[] = detections.detections.map(detection => ({
        name: detection.categories[0]?.categoryName || 'unknown object',
        confidence: detection.categories[0]?.score || 0,
        boundingBox: {
          x: detection.boundingBox?.originX || 0,
          y: detection.boundingBox?.originY || 0,
          width: detection.boundingBox?.width || 0,
          height: detection.boundingBox?.height || 0
        }
      }));

      // Filter and stabilize objects
      const validObjects = rawObjects.filter(obj => obj.confidence > 0.15);
      const stableObjects = analyzeObjectStability(validObjects);
      
      const environmentContext = generateDetailedEnvironmentContext(stableObjects, motion);
      
      // Enhanced real-time description
      let description = '';
      if (stableObjects.length === 0) {
        description = motion.isMotionDetected 
          ? `Movement detected moving ${motion.motionDirection} but no clear objects visible`
          : 'No objects currently detected in view';
      } else if (stableObjects.length === 1) {
        const obj = stableObjects[0];
        const size = obj.boundingBox.width * obj.boundingBox.height < 0.02 ? 'small ' : '';
        description = `${size}${obj.name} detected with ${Math.round(obj.confidence * 100)}% confidence`;
        if (motion.isMotionDetected) {
          description += `, ${motion.motionDirection} movement active`;
        }
      } else {
        const objectNames = stableObjects.map(obj => obj.name);
        const uniqueObjects = [...new Set(objectNames)];
        description = `${stableObjects.length} objects detected: ${uniqueObjects.slice(0, 3).join(', ')}`;
        if (uniqueObjects.length > 3) description += ` and ${uniqueObjects.length - 3} more`;
        if (motion.isMotionDetected) {
          description += `. ${motion.motionDirection} movement detected`;
        }
      }

      const result: ObjectDetectionResult = {
        objects: stableObjects,
        timestamp: new Date(),
        description,
        motion,
        environmentContext
      };

      setLastDetection(result);
      
      return result;
    } catch (err) {
      console.error('Object detection error:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      return null;
    }
  }, [isReady, analyzeMotion, analyzeObjectStability, generateDetailedEnvironmentContext]);

  return {
    isLoading,
    isReady,
    error,
    lastDetection,
    initializeDetector,
    detectObjects
  };
};
