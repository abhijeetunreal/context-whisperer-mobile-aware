
import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Eye, AlertCircle, Volume2, Loader2 } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useContextDetection } from '@/hooks/useContextDetection';
import { useObjectDetection } from '@/hooks/useObjectDetection';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

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
  const lastSpokenObjectsRef = useRef<string | null>(null);

  // Initialize MediaPipe when component mounts
  useEffect(() => {
    objectDetection.initializeDetector();
  }, [objectDetection.initializeDetector]);

  // Start/stop camera based on isActive prop
  useEffect(() => {
    if (isActive && !camera.isActive) {
      camera.startCamera();
    } else if (!isActive && camera.isActive) {
      camera.stopCamera();
    }
  }, [isActive]);

  // Handle continuous object detection every 2 seconds
  useEffect(() => {
    if (camera.isActive && camera.videoRef.current && objectDetection.isReady) {
      console.log('Starting real-time object detection...');
      
      // Clear any existing interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }

      // Start new detection interval
      detectionIntervalRef.current = setInterval(async () => {
        if (camera.videoRef.current && camera.videoRef.current.readyState >= 2) {
          console.log('Processing frame for object detection...');
          
          // Run both context and object detection
          contextDetection.processFrame(camera.videoRef.current);
          const objectResult = await objectDetection.detectObjects(camera.videoRef.current);
          
          // Speak detected objects for blind users
          if (voiceEnabled && objectResult && !textToSpeech.isSpeaking) {
            const currentObjects = objectResult.description;
            
            // Only speak if objects changed to avoid repetitive announcements
            if (lastSpokenObjectsRef.current !== currentObjects && objectResult.objects.length > 0) {
              const spokenText = `${objectResult.description}. ${objectResult.objects.length > 1 ? 'Multiple objects detected' : 'Object detected'} in your view.`;
              
              textToSpeech.speak(spokenText);
              lastSpokenObjectsRef.current = currentObjects;
              
              console.log('Speaking objects:', spokenText);
            }
          }
        }
      }, 2000); // Every 2 seconds

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = null;
        }
      };
    } else {
      // Stop detection when camera is not active or MediaPipe not ready
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
    }
  }, [camera.isActive, objectDetection.isReady, contextDetection.processFrame, objectDetection.detectObjects, voiceEnabled, textToSpeech]);

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
            <h3 className="font-semibold text-slate-800">AI-Powered Camera Feed</h3>
            <p className="text-sm text-slate-600">
              {camera.isActive ? 'Real-time object detection with voice descriptions' : 'Camera inactive'}
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
          {contextDetection.isProcessing && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3 animate-pulse" />
              Analyzing
            </Badge>
          )}
          {textToSpeech.isSpeaking && voiceEnabled && (
            <Badge variant="outline" className="flex items-center gap-1 bg-purple-50">
              <Volume2 className="w-3 h-3 animate-pulse text-purple-600" />
              Speaking
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
          <p className="text-sm text-orange-700">AI Detection error: {objectDetection.error}</p>
        </div>
      )}

      {textToSpeech.error && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-700">Voice error: {textToSpeech.error}</p>
        </div>
      )}

      <div className="relative">
        <video
          ref={camera.videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-48 object-cover rounded-lg border-2 ${
            camera.isActive ? 'border-green-200' : 'border-slate-200'
          }`}
          style={{
            display: camera.isActive ? 'block' : 'none'
          }}
        />
        
        {!camera.isActive && (
          <div className="w-full h-48 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
            <div className="text-center">
              <CameraOff className="w-12 h-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">AI-powered camera feed will appear here</p>
              <p className="text-xs text-slate-400 mt-1">Real-time object detection with voice descriptions</p>
            </div>
          </div>
        )}

        {camera.isActive && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="default" className="bg-green-500 text-white">
              Live
            </Badge>
            {objectDetection.isReady && (
              <Badge variant="secondary" className="bg-blue-500 text-white">
                AI Ready
              </Badge>
            )}
            {voiceEnabled && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                Voice On
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Object Detection Results */}
      {objectDetection.lastDetection && objectDetection.lastDetection.objects.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-1">Objects Detected</h4>
          <p className="text-sm text-green-700 mb-2">
            {objectDetection.lastDetection.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {objectDetection.lastDetection.objects.map((obj, index) => (
              <Badge key={index} variant="outline" className="text-xs bg-green-100">
                {obj.name} ({Math.round(obj.confidence * 100)}%)
              </Badge>
            ))}
          </div>
          <p className="text-xs text-green-600 mt-1">
            Last detected: {objectDetection.lastDetection.timestamp.toLocaleTimeString()}
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
