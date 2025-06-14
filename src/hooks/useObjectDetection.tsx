
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

interface ObjectDetectionResult {
  objects: DetectedObject[];
  timestamp: Date;
  description: string;
}

export const useObjectDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDetection, setLastDetection] = useState<ObjectDetectionResult | null>(null);
  
  const objectDetectorRef = useRef<ObjectDetector | null>(null);

  const initializeDetector = useCallback(async () => {
    if (objectDetectorRef.current) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Initializing MediaPipe Object Detector...');
      
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      
      const objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
          delegate: "GPU"
        },
        scoreThreshold: 0.3,
        runningMode: "VIDEO"
      });
      
      objectDetectorRef.current = objectDetector;
      setIsReady(true);
      console.log('MediaPipe Object Detector initialized successfully');
    } catch (err) {
      console.error('Failed to initialize MediaPipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize object detector');
    } finally {
      setIsLoading(false);
    }
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

      // Filter objects with confidence > 0.4 for better accuracy
      const highConfidenceObjects = objects.filter(obj => obj.confidence > 0.4);
      
      // Create description for voice feedback
      let description = '';
      if (highConfidenceObjects.length === 0) {
        description = 'No clear objects detected in view';
      } else if (highConfidenceObjects.length === 1) {
        description = `I can see a ${highConfidenceObjects[0].name} with ${Math.round(highConfidenceObjects[0].confidence * 100)}% confidence`;
      } else {
        const objectNames = highConfidenceObjects.map(obj => obj.name);
        const uniqueObjects = [...new Set(objectNames)];
        description = `I can see ${uniqueObjects.length} different objects: ${uniqueObjects.join(', ')}`;
      }

      const result: ObjectDetectionResult = {
        objects: highConfidenceObjects,
        timestamp: new Date(),
        description
      };

      setLastDetection(result);
      console.log('Objects detected:', result);
      
      return result;
    } catch (err) {
      console.error('Object detection error:', err);
      setError(err instanceof Error ? err.message : 'Detection failed');
      return null;
    }
  }, [isReady]);

  return {
    isLoading,
    isReady,
    error,
    lastDetection,
    initializeDetector,
    detectObjects
  };
};
