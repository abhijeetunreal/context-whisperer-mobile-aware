
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
  const lastProcessTimeRef = useRef<number>(0);

  const initializeDetector = useCallback(async () => {
    if (objectDetectorRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing enhanced MediaPipe Object Detector...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      // Using EfficientDet Lite0 with optimized settings for better accuracy
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
          delegate: "GPU"
        },
        scoreThreshold: 0.05, // Very low threshold for small objects
        maxResults: 25, // More objects for comprehensive detection
        runningMode: "VIDEO"
      });
      
      objectDetectorRef.current = objectDetector;
      setIsReady(true);
      console.log('Enhanced MediaPipe Object Detector initialized successfully');
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

    // Enhanced motion detection with better sensitivity
    for (let i = 0; i < prev.length; i += 16) {
      const prevBrightness = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      const currBrightness = (curr[i] + curr[i + 1] + curr[i + 2]) / 3;
      const diff = Math.abs(prevBrightness - currBrightness);
      
      if (diff > 8) {
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

    const motionLevel = (totalDiff / (prev.length / 16)) * 100;
    const isMotionDetected = motionLevel > 1.2;
    
    let motionDirection = 'none';
    if (isMotionDetected) {
      if (Math.abs(horizontalMotion) > Math.abs(verticalMotion)) {
        motionDirection = horizontalMotion > 0 ? 'right' : 'left';
      } else if (Math.abs(verticalMotion) > 6) {
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
    if (detectionHistoryRef.current.length > 4) {
      detectionHistoryRef.current.shift();
    }

    if (detectionHistoryRef.current.length < 2) {
      return currentObjects.filter(obj => obj.confidence > 0.15);
    }

    // Filter objects that appear consistently across frames
    const stableObjects: DetectedObject[] = [];
    
    currentObjects.forEach(obj => {
      let consistentDetections = 1;
      let totalConfidence = obj.confidence;
      
      detectionHistoryRef.current.slice(0, -1).forEach(historyFrame => {
        const similarObject = historyFrame.find(histObj => 
          histObj.name === obj.name && 
          Math.abs(histObj.boundingBox.x - obj.boundingBox.x) < 0.15 &&
          Math.abs(histObj.boundingBox.y - obj.boundingBox.y) < 0.15 &&
          Math.abs(histObj.boundingBox.width - obj.boundingBox.width) < 0.1
        );
        if (similarObject) {
          consistentDetections++;
          totalConfidence += similarObject.confidence;
        }
      });

      // Include object if detected in at least 2 out of last 4 frames with good confidence
      const avgConfidence = totalConfidence / consistentDetections;
      if (consistentDetections >= 2 && avgConfidence > 0.12) {
        stableObjects.push({
          ...obj,
          confidence: avgConfidence // Use averaged confidence
        });
      }
    });

    return stableObjects;
  }, []);

  const generateDetailedEnvironmentContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      return motion.isMotionDetected 
        ? `Dynamic scene with ${motion.motionDirection} motion detected but no distinct objects currently visible`
        : 'Static environment - no clear objects or movement detected in current view';
    }

    const objectTypes = objects.map(obj => obj.name);
    const uniqueObjects = [...new Set(objectTypes)];
    const highConfidenceObjects = objects.filter(obj => obj.confidence > 0.3);
    const smallObjects = objects.filter(obj => obj.boundingBox.width * obj.boundingBox.height < 0.03);
    
    // Enhanced categorization for better context
    const people = objectTypes.filter(type => type === 'person').length;
    const vehicles = objectTypes.filter(type => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(type));
    const furniture = objectTypes.filter(type => ['chair', 'table', 'couch', 'bed', 'desk'].includes(type));
    const electronics = objectTypes.filter(type => ['laptop', 'phone', 'tv', 'computer', 'monitor', 'keyboard', 'mouse'].includes(type));
    const food = objectTypes.filter(type => ['cup', 'bottle', 'bowl', 'banana', 'apple', 'sandwich', 'pizza', 'cake'].includes(type));
    const books = objectTypes.filter(type => ['book', 'newspaper'].includes(type));
    const indoor = objectTypes.filter(type => ['door', 'window', 'wall', 'ceiling', 'floor'].includes(type));
    const outdoor = objectTypes.filter(type => ['tree', 'sky', 'grass', 'building', 'road', 'cloud'].includes(type));

    let context = '';
    
    // Environment type assessment
    if (outdoor.length > indoor.length) {
      context += 'Outdoor environment detected with ';
    } else if (indoor.length > 0 || furniture.length > 0) {
      context += 'Indoor environment with ';
    } else {
      context += 'Mixed environment featuring ';
    }

    // Activity and object context
    if (people > 0) {
      context += `${people} ${people === 1 ? 'person' : 'people'} present, `;
    }

    if (vehicles.length > 0) {
      context += `transportation vehicles (${vehicles.slice(0, 2).join(', ')}) visible, `;
    }

    if (furniture.length > 0 && electronics.length > 0) {
      context += `workspace setup with furniture and technology, `;
    } else if (books.length > 0) {
      context += `reading or study materials present, `;
    } else if (food.length > 0) {
      context += `food and dining items visible, `;
    }

    // Object detail and quality
    if (highConfidenceObjects.length > 0) {
      const topObjects = highConfidenceObjects.slice(0, 3).map(obj => obj.name);
      context += `clearly identifying ${topObjects.join(', ')} `;
    }

    if (smallObjects.length > 0) {
      context += `plus ${smallObjects.length} smaller detailed objects `;
    }

    // Motion and activity level
    if (motion.isMotionDetected) {
      context += `with active ${motion.motionDirection} movement indicating ongoing activity (${motion.motionLevel}% motion intensity). `;
    } else {
      context += `in a stable, stationary scene with minimal movement. `;
    }

    // Detection quality summary
    const avgConfidence = objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length;
    context += `Scene analysis confidence: ${Math.round(avgConfidence * 100)}% with ${objects.length} total objects detected.`;

    return context;
  }, []);

  const detectObjects = useCallback(async (videoElement: HTMLVideoElement): Promise<ObjectDetectionResult | null> => {
    if (!objectDetectorRef.current || !isReady) {
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      return null;
    }

    // Throttle detection to avoid overwhelming the system
    const now = performance.now();
    if (now - lastProcessTimeRef.current < 100) { // Minimum 100ms between detections
      return lastDetection;
    }
    lastProcessTimeRef.current = now;

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

      // Filter and stabilize objects with improved thresholds
      const validObjects = rawObjects.filter(obj => 
        obj.confidence > 0.08 && // Lower threshold for small objects
        obj.boundingBox.width > 0.01 && 
        obj.boundingBox.height > 0.01
      );
      
      const stableObjects = analyzeObjectStability(validObjects);
      
      const environmentContext = generateDetailedEnvironmentContext(stableObjects, motion);
      
      // Enhanced real-time description with better reasoning
      let description = '';
      if (stableObjects.length === 0) {
        description = motion.isMotionDetected 
          ? `Movement detected (${motion.motionDirection}) but no clear objects currently identified`
          : 'No distinct objects detected in current view - adjusting detection sensitivity';
      } else if (stableObjects.length === 1) {
        const obj = stableObjects[0];
        const sizeDesc = obj.boundingBox.width * obj.boundingBox.height < 0.03 ? 'small ' : 
                        obj.boundingBox.width * obj.boundingBox.height > 0.2 ? 'large ' : '';
        description = `${sizeDesc}${obj.name} identified with ${Math.round(obj.confidence * 100)}% confidence`;
        if (motion.isMotionDetected) {
          description += `, ${motion.motionDirection} movement active`;
        }
      } else {
        const objectNames = stableObjects.map(obj => obj.name);
        const uniqueObjects = [...new Set(objectNames)];
        const topConfident = stableObjects
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3)
          .map(obj => obj.name);
        
        description = `${stableObjects.length} objects detected including ${topConfident.join(', ')}`;
        if (uniqueObjects.length > 3) {
          description += ` and ${uniqueObjects.length - 3} others`;
        }
        if (motion.isMotionDetected) {
          description += `. Active ${motion.motionDirection} movement detected`;
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
