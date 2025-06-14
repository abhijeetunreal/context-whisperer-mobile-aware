import { useState, useCallback, useRef } from 'react';

interface DetectedObject {
  id: string;
  name: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  trackingId?: number;
  velocity?: { x: number; y: number };
  persistenceCount: number;
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
  reasoning: string;
}

// Enhanced COCO dataset classes with better mapping
const YOLO_OBJECT_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

export const useObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<ObjectDetectionResult | null>(null);
  
  const modelRef = useRef<any>(null);
  const previousFrameRef = useRef<ImageData | null>(null);
  const objectHistoryRef = useRef<Map<string, DetectedObject[]>>(new Map());
  const trackingIdCounterRef = useRef(0);
  const lastProcessTimeRef = useRef<number>(0);

  const initializeDetector = useCallback(async () => {
    if (modelRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing Enhanced Object Detection Model...');
      
      // Load TensorFlow.js and COCO-SSD model
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      
      const model = await cocoSsd.load({
        base: 'mobilenet_v2'
      });
      
      modelRef.current = model;
      setIsReady(true);
      console.log('Enhanced Object Detection Model initialized successfully');
    } catch (err) {
      console.error('Failed to initialize enhanced model:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize enhanced object detector');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateObjectDistance = useCallback((obj1: DetectedObject, obj2: DetectedObject): number => {
    const centerX1 = obj1.boundingBox.x + obj1.boundingBox.width / 2;
    const centerY1 = obj1.boundingBox.y + obj1.boundingBox.height / 2;
    const centerX2 = obj2.boundingBox.x + obj2.boundingBox.width / 2;
    const centerY2 = obj2.boundingBox.y + obj2.boundingBox.height / 2;
    
    return Math.sqrt(Math.pow(centerX2 - centerX1, 2) + Math.pow(centerY2 - centerY1, 2));
  }, []);

  const trackObjects = useCallback((currentObjects: DetectedObject[], frameKey: string): DetectedObject[] => {
    const previousObjects = objectHistoryRef.current.get(frameKey) || [];
    const trackedObjects: DetectedObject[] = [];
    
    for (const currentObj of currentObjects) {
      let bestMatch: DetectedObject | null = null;
      let bestDistance = Infinity;
      
      // Find the closest previous object of the same class
      for (const prevObj of previousObjects) {
        if (prevObj.name === currentObj.name) {
          const distance = calculateObjectDistance(currentObj, prevObj);
          if (distance < bestDistance && distance < 100) { // Max tracking distance
            bestDistance = distance;
            bestMatch = prevObj;
          }
        }
      }
      
      if (bestMatch) {
        // Update existing tracked object
        const centerX1 = bestMatch.boundingBox.x + bestMatch.boundingBox.width / 2;
        const centerY1 = bestMatch.boundingBox.y + bestMatch.boundingBox.height / 2;
        const centerX2 = currentObj.boundingBox.x + currentObj.boundingBox.width / 2;
        const centerY2 = currentObj.boundingBox.y + currentObj.boundingBox.height / 2;
        
        trackedObjects.push({
          ...currentObj,
          id: bestMatch.id,
          trackingId: bestMatch.trackingId,
          velocity: {
            x: centerX2 - centerX1,
            y: centerY2 - centerY1
          },
          persistenceCount: bestMatch.persistenceCount + 1
        });
      } else {
        // New object detected
        trackedObjects.push({
          ...currentObj,
          id: `obj_${Date.now()}_${trackingIdCounterRef.current++}`,
          trackingId: trackingIdCounterRef.current,
          velocity: { x: 0, y: 0 },
          persistenceCount: 1
        });
      }
    }
    
    // Store current objects for next frame
    objectHistoryRef.current.set(frameKey, trackedObjects);
    
    // Clean up old history
    if (objectHistoryRef.current.size > 10) {
      const keys = Array.from(objectHistoryRef.current.keys());
      objectHistoryRef.current.delete(keys[0]);
    }
    
    return trackedObjects;
  }, [calculateObjectDistance]);

  const generateReasoning = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      return "No objects are currently visible in the scene. This could indicate an empty space, poor lighting conditions, or objects outside the camera's field of view.";
    }

    const persistentObjects = objects.filter(obj => obj.persistenceCount > 3);
    const newObjects = objects.filter(obj => obj.persistenceCount <= 3);
    const movingObjects = objects.filter(obj => obj.velocity && (Math.abs(obj.velocity.x) > 5 || Math.abs(obj.velocity.y) > 5));
    
    let reasoning = "";
    
    // Analyze persistent objects
    if (persistentObjects.length > 0) {
      reasoning += `${persistentObjects.length} objects have been consistently detected: ${persistentObjects.map(obj => obj.name).join(', ')}. `;
    }
    
    // Analyze new objects
    if (newObjects.length > 0) {
      reasoning += `${newObjects.length} new objects just appeared: ${newObjects.map(obj => obj.name).join(', ')}. `;
    }
    
    // Analyze movement
    if (movingObjects.length > 0) {
      reasoning += `${movingObjects.length} objects are in motion: `;
      movingObjects.forEach(obj => {
        const direction = obj.velocity!.x > 0 ? 'moving right' : obj.velocity!.x < 0 ? 'moving left' : 'stationary horizontally';
        const verticalDir = obj.velocity!.y > 0 ? 'moving down' : obj.velocity!.y < 0 ? 'moving up' : 'stationary vertically';
        reasoning += `${obj.name} is ${direction} and ${verticalDir}. `;
      });
    }
    
    // Scene analysis
    const people = objects.filter(obj => obj.name === 'person');
    const vehicles = objects.filter(obj => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(obj.name));
    const animals = objects.filter(obj => ['bird', 'cat', 'dog', 'horse'].includes(obj.name));
    
    if (people.length > 0 && vehicles.length > 0) {
      reasoning += "This appears to be a public space or street with both people and vehicles present. ";
    } else if (people.length > 0) {
      reasoning += "This is a people-oriented environment, likely indoor or pedestrian area. ";
    } else if (vehicles.length > 0) {
      reasoning += "This appears to be a vehicle-oriented area like a road or parking lot. ";
    }
    
    if (animals.length > 0) {
      reasoning += `Wildlife or pets are present (${animals.map(obj => obj.name).join(', ')}). `;
    }
    
    return reasoning || "Objects are present but their behavior patterns are still being analyzed.";
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

    // Enhanced motion detection with better sampling
    for (let i = 0; i < prev.length; i += 16) {
      const prevBrightness = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      const currBrightness = (curr[i] + curr[i + 1] + curr[i + 2]) / 3;
      const diff = Math.abs(prevBrightness - currBrightness);
      
      if (diff > 12) {
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

    const motionLevel = (totalDiff / (prev.length / 16)) * 50;
    const isMotionDetected = motionLevel > 1.5;
    
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

  const generateEnvironmentContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      return motion.isMotionDetected 
        ? "I can detect movement in the scene but cannot identify specific objects at the moment. The camera is actively monitoring for changes."
        : "The camera is monitoring but no objects are currently detected. The scene appears quiet and stable.";
    }

    const objectNames = objects.map(obj => obj.name);
    const uniqueObjects = [...new Set(objectNames)];
    const persistentObjects = objects.filter(obj => obj.persistenceCount > 2);
    
    let context = "";
    
    // People analysis
    const people = objects.filter(obj => obj.name === 'person');
    if (people.length > 0) {
      const persistentPeople = people.filter(p => p.persistenceCount > 2);
      if (persistentPeople.length > 0) {
        context += `I can consistently see ${persistentPeople.length} person${persistentPeople.length > 1 ? 's' : ''} who ${persistentPeople.length > 1 ? 'have' : 'has'} been in view. `;
      } else {
        context += `${people.length} person${people.length > 1 ? 's' : ''} recently entered the scene. `;
      }
    }

    // Object categorization with persistence
    const vehicles = objects.filter(obj => ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(obj.name));
    const furniture = objects.filter(obj => ['chair', 'couch', 'table', 'bed'].includes(obj.name));
    const electronics = objects.filter(obj => ['laptop', 'tv', 'cell phone', 'remote'].includes(obj.name));
    const kitchenItems = objects.filter(obj => ['bottle', 'cup', 'bowl', 'knife', 'spoon'].includes(obj.name));
    
    if (vehicles.length > 0) {
      const persistentVehicles = vehicles.filter(v => v.persistenceCount > 2);
      if (persistentVehicles.length > 0) {
        context += `Vehicles are consistently present: ${persistentVehicles.map(v => v.name).join(', ')}. `;
      }
    }
    
    if (furniture.length > 0) {
      context += `This appears to be an indoor space with furniture: ${furniture.map(f => f.name).join(', ')}. `;
    }
    
    if (electronics.length > 0) {
      context += `Electronic devices are visible: ${electronics.map(e => e.name).join(', ')}, suggesting an active workspace. `;
    }
    
    if (kitchenItems.length > 0) {
      context += `Kitchen or dining items detected: ${kitchenItems.map(k => k.name).join(', ')}, indicating a food preparation area. `;
    }
    
    // Motion integration
    if (motion.isMotionDetected) {
      const movingObjects = objects.filter(obj => obj.velocity && (Math.abs(obj.velocity.x) > 3 || Math.abs(obj.velocity.y) > 3));
      if (movingObjects.length > 0) {
        context += `Active movement detected - ${movingObjects.map(obj => obj.name).join(', ')} are in motion. `;
      } else {
        context += `General movement detected in the scene. `;
      }
    } else {
      context += "The scene is stable with minimal movement. ";
    }
    
    // Confidence assessment
    const avgConfidence = objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length;
    if (avgConfidence > 0.7) {
      context += "Object detection confidence is high with excellent visibility.";
    } else if (avgConfidence > 0.5) {
      context += "Object detection confidence is good with adequate visibility.";
    } else {
      context += "Object detection confidence is moderate due to lighting or distance factors.";
    }

    return context;
  }, []);

  const detectObjects = useCallback(async (videoElement: HTMLVideoElement): Promise<ObjectDetectionResult | null> => {
    if (!modelRef.current || !isReady) {
      console.log('Enhanced object detector not ready');
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.log('Video element not ready');
      return null;
    }

    // Throttle detection for performance
    const now = performance.now();
    if (now - lastProcessTimeRef.current < 200) {
      return lastDetection;
    }
    lastProcessTimeRef.current = now;

    try {
      const startTime = performance.now();
      
      // Detect objects using the enhanced model
      const predictions = await modelRef.current.detect(videoElement, 20, 0.3); // Max 20 objects, 30% confidence
      
      console.log('Enhanced model raw predictions:', predictions.length);
      
      // Get frame data for motion analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const motion = analyzeMotion(imageData);
      
      // Convert predictions to our format
      const objects: DetectedObject[] = predictions.map((prediction: any, index: number) => ({
        id: `temp_${index}`,
        name: prediction.class,
        confidence: prediction.score,
        boundingBox: {
          x: prediction.bbox[0],
          y: prediction.bbox[1],
          width: prediction.bbox[2],
          height: prediction.bbox[3]
        },
        persistenceCount: 1
      }));

      // Apply object tracking
      const trackedObjects = trackObjects(objects, `frame_${now}`);
      
      console.log('Enhanced tracked objects:', trackedObjects.length, trackedObjects.map(obj => `${obj.name} (${Math.round(obj.confidence * 100)}%, tracked: ${obj.persistenceCount})`));
      
      // Generate reasoning and context
      const reasoning = generateReasoning(trackedObjects, motion);
      const environmentContext = generateEnvironmentContext(trackedObjects, motion);
      
      let description = '';
      if (trackedObjects.length === 0) {
        description = motion.isMotionDetected 
          ? `Movement detected but no objects identified`
          : 'No objects currently detected';
      } else if (trackedObjects.length === 1) {
        const obj = trackedObjects[0];
        description = `${obj.name} detected with ${Math.round(obj.confidence * 100)}% confidence (tracked ${obj.persistenceCount} times)`;
      } else {
        const topObjects = trackedObjects.slice(0, 4).map(obj => obj.name);
        description = `${trackedObjects.length} objects detected: ${topObjects.join(', ')}`;
      }

      const result: ObjectDetectionResult = {
        objects: trackedObjects,
        timestamp: new Date(),
        description,
        motion,
        environmentContext,
        reasoning
      };

      setLastDetection(result);
      console.log('Enhanced detection with reasoning:', result);
      
      return result;
    } catch (err) {
      console.error('Enhanced object detection error:', err);
      setError(err instanceof Error ? err.message : 'Enhanced detection failed');
      return null;
    }
  }, [isReady, analyzeMotion, trackObjects, generateReasoning, generateEnvironmentContext, lastDetection]);

  return {
    isLoading,
    isReady,
    error,
    lastDetection,
    initializeDetector,
    detectObjects
  };
};
