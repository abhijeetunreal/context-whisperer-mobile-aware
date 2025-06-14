
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

// Comprehensive object class mapping for better detection
const ENHANCED_OBJECT_CLASSES = {
  // People and animals
  'person': 'person',
  'bicycle': 'bike',
  'car': 'car',
  'motorcycle': 'motorcycle',
  'airplane': 'airplane',
  'bus': 'bus',
  'train': 'train',
  'truck': 'truck',
  'boat': 'boat',
  'traffic light': 'traffic light',
  'fire hydrant': 'fire hydrant',
  'stop sign': 'stop sign',
  'parking meter': 'parking meter',
  'bench': 'bench',
  'bird': 'bird',
  'cat': 'cat',
  'dog': 'dog',
  'horse': 'horse',
  'sheep': 'sheep',
  'cow': 'cow',
  'elephant': 'elephant',
  'bear': 'bear',
  'zebra': 'zebra',
  'giraffe': 'giraffe',
  
  // Household items
  'backpack': 'backpack',
  'umbrella': 'umbrella',
  'handbag': 'handbag',
  'tie': 'tie',
  'suitcase': 'suitcase',
  'frisbee': 'frisbee',
  'skis': 'skis',
  'snowboard': 'snowboard',
  'sports ball': 'ball',
  'kite': 'kite',
  'baseball bat': 'baseball bat',
  'baseball glove': 'baseball glove',
  'skateboard': 'skateboard',
  'surfboard': 'surfboard',
  'tennis racket': 'tennis racket',
  
  // Kitchen and food
  'bottle': 'bottle',
  'wine glass': 'wine glass',
  'cup': 'cup',
  'fork': 'fork',
  'knife': 'knife',
  'spoon': 'spoon',
  'bowl': 'bowl',
  'banana': 'banana',
  'apple': 'apple',
  'sandwich': 'sandwich',
  'orange': 'orange',
  'broccoli': 'broccoli',
  'carrot': 'carrot',
  'hot dog': 'hot dog',
  'pizza': 'pizza',
  'donut': 'donut',
  'cake': 'cake',
  
  // Furniture and household
  'chair': 'chair',
  'couch': 'sofa',
  'potted plant': 'plant',
  'bed': 'bed',
  'dining table': 'table',
  'toilet': 'toilet',
  'tv': 'television',
  'laptop': 'laptop',
  'mouse': 'computer mouse',
  'remote': 'remote control',
  'keyboard': 'keyboard',
  'cell phone': 'phone',
  'microwave': 'microwave',
  'oven': 'oven',
  'toaster': 'toaster',
  'sink': 'sink',
  'refrigerator': 'refrigerator',
  'book': 'book',
  'clock': 'clock',
  'vase': 'vase',
  'scissors': 'scissors',
  'teddy bear': 'teddy bear',
  'hair drier': 'hair dryer',
  'toothbrush': 'toothbrush'
};

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
      console.log('Initializing Enhanced MediaPipe Object Detector...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      // Use the more comprehensive COCO-trained model for better object variety
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite",
          delegate: "GPU"
        },
        scoreThreshold: 0.25, // Lower threshold to catch more objects
        maxResults: 15, // More objects for comprehensive detection
        runningMode: "VIDEO"
      });
      
      objectDetectorRef.current = objectDetector;
      setIsReady(true);
      console.log('Enhanced MediaPipe Object Detector initialized successfully with comprehensive object classes');
    } catch (err) {
      console.error('Failed to initialize Enhanced MediaPipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize enhanced object detector');
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

    // Sample every 8th pixel for performance
    for (let i = 0; i < prev.length; i += 32) {
      const prevBrightness = (prev[i] + prev[i + 1] + prev[i + 2]) / 3;
      const currBrightness = (curr[i] + curr[i + 1] + curr[i + 2]) / 3;
      const diff = Math.abs(prevBrightness - currBrightness);
      
      if (diff > 15) {
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

    const motionLevel = (totalDiff / (prev.length / 32)) * 100;
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

  const generateNaturalLanguageContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    if (objects.length === 0) {
      if (motion.isMotionDetected) {
        return `I can see movement in the scene with ${motion.motionDirection} motion, but I cannot clearly identify specific objects at the moment.`;
      }
      return 'The camera is active but I cannot identify any specific objects in the current view. The scene appears to be stable.';
    }

    const objectNames = objects.map(obj => obj.name);
    const uniqueObjects = [...new Set(objectNames)];
    
    // Enhanced categorization with more object types
    const peopleCount = objectNames.filter(name => name === 'person').length;
    const animals = objectNames.filter(name => ['bird', 'cat', 'dog', 'horse', 'cow', 'sheep', 'elephant', 'bear', 'zebra', 'giraffe'].includes(name));
    const vehicles = objectNames.filter(name => ['car', 'truck', 'bus', 'motorcycle', 'bike', 'bicycle', 'airplane', 'boat', 'train'].includes(name));
    const furniture = objectNames.filter(name => ['chair', 'sofa', 'couch', 'table', 'bed', 'bench'].includes(name));
    const electronics = objectNames.filter(name => ['laptop', 'phone', 'television', 'tv', 'computer mouse', 'keyboard', 'remote control'].includes(name));
    const kitchenItems = objectNames.filter(name => ['bottle', 'cup', 'bowl', 'spoon', 'knife', 'fork', 'microwave', 'oven', 'refrigerator', 'toaster'].includes(name));
    const food = objectNames.filter(name => ['banana', 'apple', 'orange', 'broccoli', 'carrot', 'pizza', 'sandwich', 'cake', 'donut'].includes(name));
    const books = objectNames.filter(name => ['book'].includes(name));
    const sports = objectNames.filter(name => ['ball', 'tennis racket', 'baseball bat', 'skateboard', 'surfboard', 'skis', 'snowboard'].includes(name));
    const clothing = objectNames.filter(name => ['tie', 'backpack', 'handbag', 'suitcase', 'umbrella'].includes(name));
    const plants = objectNames.filter(name => ['plant', 'potted plant'].includes(name));

    let description = '';
    
    // Start with people
    if (peopleCount > 0) {
      if (peopleCount === 1) {
        description += 'I can see one person in the scene. ';
      } else {
        description += `I can see ${peopleCount} people in the scene. `;
      }
    }

    // Add animals
    if (animals.length > 0) {
      const uniqueAnimals = [...new Set(animals)];
      if (uniqueAnimals.length === 1) {
        description += `I can see a ${uniqueAnimals[0]} in the area. `;
      } else {
        description += `I can see animals including ${uniqueAnimals.slice(0, 2).join(' and ')}. `;
      }
    }

    // Add vehicles
    if (vehicles.length > 0) {
      const uniqueVehicles = [...new Set(vehicles)];
      if (uniqueVehicles.length === 1) {
        description += `I can see a ${uniqueVehicles[0]} present. `;
      } else {
        description += `I can see vehicles including ${uniqueVehicles.slice(0, 2).join(' and ')}. `;
      }
    }
    
    // Add environment context based on objects
    if (electronics.length > 0 && furniture.length > 0) {
      description += 'This appears to be a workspace or office environment with electronic devices and furniture. ';
    } else if (kitchenItems.length > 0 || food.length > 0) {
      description += 'This looks like a kitchen or dining area with food-related items visible. ';
    } else if (books.length > 0) {
      description += 'This seems to be a study or reading area with books present. ';
    } else if (vehicles.length > 0) {
      description += 'I can see vehicles, suggesting this is likely an outdoor area, street, or parking space. ';
    } else if (sports.length > 0) {
      description += 'This appears to be a recreational or sports area with sporting equipment visible. ';
    } else if (plants.length > 0) {
      description += 'This looks like a space with plants or greenery, possibly indoor or outdoor garden area. ';
    } else if (furniture.length > 0) {
      description += 'This appears to be an indoor living or working space with furniture. ';
    }
    
    // Add specific objects (showing variety)
    if (uniqueObjects.length <= 4) {
      const objectList = uniqueObjects.filter(obj => obj !== 'person').slice(0, 3).join(', ');
      if (objectList) {
        description += `Specifically, I can identify: ${objectList}. `;
      }
    } else {
      const topObjects = objects
        .filter(obj => obj.name !== 'person')
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 4)
        .map(obj => obj.name);
      if (topObjects.length > 0) {
        description += `Among various items, I can clearly see: ${topObjects.join(', ')}. `;
      }
    }
    
    // Add motion information
    if (motion.isMotionDetected) {
      if (motion.motionDirection === 'general') {
        description += `There is active movement in the scene. `;
      } else {
        description += `I detect ${motion.motionDirection} movement with ${motion.motionLevel.toFixed(0)}% intensity. `;
      }
    } else {
      description += 'The scene is currently stable with minimal movement. ';
    }
    
    // Add confidence summary
    const avgConfidence = objects.reduce((sum, obj) => sum + obj.confidence, 0) / objects.length;
    if (avgConfidence > 0.6) {
      description += 'Object identification confidence is high with clear visibility.';
    } else if (avgConfidence > 0.4) {
      description += 'Object identification confidence is moderate.';
    } else {
      description += 'Object identification confidence is lower due to lighting or camera conditions.';
    }

    return description;
  }, []);

  const generateEnvironmentContext = useCallback((objects: DetectedObject[], motion: MotionData): string => {
    return generateNaturalLanguageContext(objects, motion);
  }, [generateNaturalLanguageContext]);

  const detectObjects = useCallback(async (videoElement: HTMLVideoElement): Promise<ObjectDetectionResult | null> => {
    if (!objectDetectorRef.current || !isReady) {
      console.log('Enhanced object detector not ready');
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      console.log('Video element not ready');
      return null;
    }

    // Throttle detection
    const now = performance.now();
    if (now - lastProcessTimeRef.current < 150) { // Faster detection for more objects
      return lastDetection;
    }
    lastProcessTimeRef.current = now;

    try {
      const startTimeMs = performance.now();
      const detections = objectDetectorRef.current.detectForVideo(videoElement, startTimeMs);
      
      console.log('Enhanced raw detections:', detections.detections.length);
      
      // Get frame data for motion analysis
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      const motion = analyzeMotion(imageData);
      
      const objects: DetectedObject[] = detections.detections.map(detection => {
        const rawName = detection.categories[0]?.categoryName || 'unknown';
        const enhancedName = ENHANCED_OBJECT_CLASSES[rawName] || rawName;
        
        return {
          name: enhancedName,
          confidence: detection.categories[0]?.score || 0,
          boundingBox: {
            x: detection.boundingBox?.originX || 0,
            y: detection.boundingBox?.originY || 0,
            width: detection.boundingBox?.width || 0,
            height: detection.boundingBox?.height || 0
          }
        };
      }).filter(obj => obj.confidence > 0.2); // Lower threshold for more variety

      console.log('Enhanced filtered objects:', objects.length, objects.map(obj => `${obj.name} (${Math.round(obj.confidence * 100)}%)`));
      
      // Generate enhanced natural language environment context
      const environmentContext = generateNaturalLanguageContext(objects, motion);
      
      let description = '';
      if (objects.length === 0) {
        description = motion.isMotionDetected 
          ? `Movement detected but no objects identified`
          : 'No objects currently detected';
      } else if (objects.length === 1) {
        const obj = objects[0];
        description = `${obj.name} detected with ${Math.round(obj.confidence * 100)}% confidence`;
      } else {
        const topObjects = objects.slice(0, 4).map(obj => obj.name);
        description = `${objects.length} objects detected: ${topObjects.join(', ')}`;
      }

      const result: ObjectDetectionResult = {
        objects,
        timestamp: new Date(),
        description,
        motion,
        environmentContext
      };

      setLastDetection(result);
      console.log('Enhanced detection result with comprehensive object types:', result);
      
      return result;
    } catch (err) {
      console.error('Enhanced object detection error:', err);
      setError(err instanceof Error ? err.message : 'Enhanced detection failed');
      return null;
    }
  }, [isReady, analyzeMotion, generateNaturalLanguageContext, lastDetection]);

  return {
    isLoading,
    isReady,
    error,
    lastDetection,
    initializeDetector,
    detectObjects
  };
};
