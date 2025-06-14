import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Eye, AlertCircle, Volume2, Loader2, Activity } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useContextDetection } from '@/hooks/useContextDetection';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import ObjectAnnotations from '@/components/ObjectAnnotations';

interface CameraFeedProps {
  isActive: boolean;
  onToggle: () => void;
  onContextDetected: (context: any) => void;
  voiceEnabled: boolean;
  apiKey: string;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  isActive, 
  onToggle, 
  onContextDetected,
  voiceEnabled,
  apiKey
}) => {
  const camera = useCamera();
  const contextDetection = useContextDetection();
  const objectDetection = useObjectDetection();
  const textToSpeech = useTextToSpeech({ apiKey });
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const contextIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const voiceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isAnalyzingContext, setIsAnalyzingContext] = useState(false);

  // Update container dimensions when video loads
  useEffect(() => {
    const updateDimensions = () => {
      if (videoContainerRef.current) {
        const rect = videoContainerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [camera.isActive]);

  // Initialize MediaPipe object detection model when component mounts
  useEffect(() => {
    console.log('Initializing MediaPipe ObjectDetector for enhanced accuracy...');
    objectDetection.initializeDetector();
  }, [objectDetection.initializeDetector]);

  // Start/stop camera based on isActive prop
  useEffect(() => {
    if (isActive && !camera.isActive) {
      console.log('Starting camera...');
      camera.startCamera();
      // Reset environment state when starting camera
      textToSpeech.resetEnvironmentState();
    } else if (!isActive && camera.isActive) {
      console.log('Stopping camera...');
      camera.stopCamera();
    }
  }, [isActive, camera.isActive, camera.startCamera, camera.stopCamera, textToSpeech.resetEnvironmentState]);

  // Cleanup intervals when component unmounts or camera stops
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      if (contextIntervalRef.current) {
        clearInterval(contextIntervalRef.current);
        contextIntervalRef.current = null;
      }
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    };
  }, []);

  // Enhanced MediaPipe object detection with superior accuracy
  useEffect(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (camera.isActive && camera.videoRef.current && objectDetection.isReady) {
      console.log('Starting MediaPipe object detection with enhanced accuracy...');
      
      detectionIntervalRef.current = setInterval(async () => {
        if (camera.videoRef.current && camera.videoRef.current.readyState >= 2) {
          try {
            const result = await objectDetection.detectObjects(camera.videoRef.current);
            if (result) {
              console.log('MediaPipe detection result:', result.objects.length, 'objects with superior accuracy');
              
              const objectTypes = [...new Set(result.objects.map(obj => obj.name))];
              if (objectTypes.length > 0) {
                console.log('Detected with MediaPipe:', objectTypes.join(', '));
              }
            }
          } catch (error) {
            console.error('MediaPipe object detection error:', error);
          }
        }
      }, 150); // Optimized interval for MediaPipe
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    };
  }, [camera.isActive, objectDetection.isReady, objectDetection.detectObjects]);

  // Enhanced voice description with text detection and smart change detection
  useEffect(() => {
    if (voiceIntervalRef.current) {
      clearInterval(voiceIntervalRef.current);
      voiceIntervalRef.current = null;
    }

    if (camera.isActive && voiceEnabled && objectDetection.isReady) {
      console.log('🎤 Starting smart voice descriptions with text detection...');
      
      const triggerSmartVoiceDescription = async () => {
        if (camera.videoRef.current && camera.videoRef.current.readyState >= 2) {
          console.log('🎤 Smart voice interval triggered...');
          
          try {
            const objectResult = objectDetection.lastDetection;
            
            if (objectResult && !textToSpeech.isSpeaking) {
              const currentObjects = objectResult.objects.map(obj => obj.name);
              console.log('🎤 Current objects for smart voice:', currentObjects);
              
              // Pass video element for text detection
              await textToSpeech.speak(
                objectResult.environmentContext, 
                currentObjects, 
                objectResult.reasoning,
                camera.videoRef.current
              );
            }
          } catch (error) {
            console.error('🎤 Smart voice description error:', error);
          }
        }
      };

      triggerSmartVoiceDescription();
      voiceIntervalRef.current = setInterval(triggerSmartVoiceDescription, 5000);
    }

    return () => {
      if (voiceIntervalRef.current) {
        clearInterval(voiceIntervalRef.current);
        voiceIntervalRef.current = null;
      }
    };
  }, [camera.isActive, voiceEnabled, objectDetection.isReady, objectDetection.lastDetection, textToSpeech.isSpeaking, textToSpeech.speak]);

  // Context analysis interval - separate from voice
  useEffect(() => {
    if (contextIntervalRef.current) {
      clearInterval(contextIntervalRef.current);
      contextIntervalRef.current = null;
    }

    if (camera.isActive && camera.videoRef.current && objectDetection.isReady) {
      console.log('Starting context analysis interval...');
      
      contextIntervalRef.current = setInterval(async () => {
        if (camera.videoRef.current && camera.videoRef.current.readyState >= 2) {
          setIsAnalyzingContext(true);
          
          try {
            // Process context for environment analysis
            contextDetection.processFrame(camera.videoRef.current);
            
            // Pass context to parent if available
            if (contextDetection.detectedContext) {
              onContextDetected(contextDetection.detectedContext);
            }
            
          } catch (error) {
            console.error('Context analysis error:', error);
          } finally {
            setIsAnalyzingContext(false);
          }
        }
      }, 8000); // Every 8 seconds for context analysis
    }

    return () => {
      if (contextIntervalRef.current) {
        clearInterval(contextIntervalRef.current);
        contextIntervalRef.current = null;
      }
    };
  }, [camera.isActive, objectDetection.isReady, contextDetection.processFrame, onContextDetected, contextDetection.detectedContext]);

  // Pass detected context to parent
  useEffect(() => {
    if (contextDetection.detectedContext) {
      console.log('Context detected, passing to parent:', contextDetection.detectedContext);
      onContextDetected(contextDetection.detectedContext);
    }
  }, [contextDetection.detectedContext, onContextDetected]);

  if (!camera.isSupported) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Camera Not Supported
        </h3>
        <p className="text-slate-500">
          Your browser or device doesn't support camera access.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${camera.isActive ? 'bg-green-100' : 'bg-slate-100'}`}>
            {camera.isActive ? (
              <Camera className={`w-5 h-5 ${camera.isActive ? 'text-green-600' : 'text-slate-600'}`} />
            ) : (
              <CameraOff className="w-5 h-5 text-slate-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Enhanced Object Detection</h3>
            <p className="text-sm text-slate-600">
              {camera.isActive ? 'Smart tracking with text detection' : 'Camera inactive'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {objectDetection.isLoading && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading AI
            </Badge>
          )}
          {isAnalyzingContext && (
            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
              <Eye className="w-3 h-3 animate-pulse text-blue-600" />
              Analyzing
            </Badge>
          )}
          {objectDetection.lastDetection && objectDetection.lastDetection.objects.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 bg-green-50">
              <Activity className="w-3 h-3 text-green-600" />
              {objectDetection.lastDetection.objects.length} Tracked
            </Badge>
          )}
          {textToSpeech.isSpeaking && voiceEnabled && (
            <Badge variant="outline" className="flex items-center gap-1 bg-purple-50">
              <Volume2 className="w-3 h-3 animate-pulse text-purple-600" />
              Smart Voice
            </Badge>
          )}
          <Button 
            onClick={onToggle}
            size="sm"
            variant={camera.isActive ? "destructive" : "default"}
          >
            {camera.isActive ? 'Stop' : 'Start'} Camera
          </Button>
        </div>
      </div>

      {camera.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{camera.error}</p>
        </div>
      )}

      {objectDetection.error && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">MediaPipe Detection error: {objectDetection.error}</p>
        </div>
      )}

      {textToSpeech.error && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">Voice error: {textToSpeech.error}</p>
        </div>
      )}

      <div className="relative">
        <div 
          ref={videoContainerRef}
          className="relative w-full aspect-square bg-slate-100 rounded-lg border-2 border-slate-200 overflow-hidden"
        >
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${
              camera.isActive ? 'block' : 'hidden'
            }`}
            onLoadedMetadata={() => {
              if (videoContainerRef.current) {
                const rect = videoContainerRef.current.getBoundingClientRect();
                setContainerDimensions({ width: rect.width, height: rect.height });
              }
            }}
          />
          
          {/* Enhanced Object Annotations with improved tracking */}
          {camera.isActive && 
           objectDetection.lastDetection && 
           objectDetection.lastDetection.objects.length > 0 && 
           camera.videoRef.current && (
            <ObjectAnnotations
              objects={objectDetection.lastDetection.objects}
              videoWidth={camera.videoRef.current.videoWidth}
              videoHeight={camera.videoRef.current.videoHeight}
              containerWidth={containerDimensions.width}
              containerHeight={containerDimensions.height}
            />
          )}
          
          {!camera.isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <CameraOff className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-500">Smart object detection with tracking</p>
                <p className="text-xs text-slate-400 mt-1">Includes text detection and voice descriptions</p>
              </div>
            </div>
          )}

          {camera.isActive && (
            <div className="absolute top-2 right-2 flex gap-2">
              <Badge variant="default" className="bg-blue-500 text-white text-xs">
                AI Tracking
              </Badge>
              {objectDetection.isReady && (
                <Badge variant="secondary" className="bg-green-500 text-white text-xs">
                  Enhanced
                </Badge>
              )}
              {voiceEnabled && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                  Smart Voice
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced MediaPipe Object Detection Results */}
      {objectDetection.lastDetection && objectDetection.lastDetection.objects.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-1">MediaPipe Enhanced Detection</h4>
          <p className="text-sm text-green-700 mb-2">
            {objectDetection.lastDetection.environmentContext}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {objectDetection.lastDetection.objects
              .sort((a, b) => b.confidence - a.confidence)
              .slice(0, 6)
              .map((obj, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-green-100">
                  {obj.name} ({Math.round(obj.confidence * 100)}%) 
                  {obj.persistenceCount > 1 && ` ×${obj.persistenceCount}`}
                </Badge>
              ))}
          </div>
          <p className="text-xs text-green-600">
            {objectDetection.lastDetection.reasoning}
          </p>
        </div>
      )}

      {/* Context Detection Results */}
      {contextDetection.detectedContext && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-1">Environment Context</h4>
          <p className="text-sm text-blue-700 mb-2">
            {contextDetection.detectedContext.description}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Context: {contextDetection.detectedContext.name} ({Math.round(contextDetection.detectedContext.confidence * 100)}% confident)
          </p>
        </div>
      )}
    </Card>
  );
};

export default CameraFeed;
