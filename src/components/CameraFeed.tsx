
import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, CameraOff, Eye, AlertCircle } from 'lucide-react';
import { useCamera } from '@/hooks/useCamera';
import { useContextDetection } from '@/hooks/useContextDetection';

interface CameraFeedProps {
  isActive: boolean;
  onToggle: () => void;
  onContextDetected: (context: any) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  isActive, 
  onToggle, 
  onContextDetected 
}) => {
  const camera = useCamera();
  const contextDetection = useContextDetection();

  // Start/stop camera based on isActive prop
  useEffect(() => {
    if (isActive && !camera.isActive) {
      camera.startCamera();
      contextDetection.startDetection();
    } else if (!isActive && camera.isActive) {
      camera.stopCamera();
      contextDetection.stopDetection();
    }
  }, [isActive]);

  // Process frames for context detection
  useEffect(() => {
    if (camera.isActive && camera.videoRef.current) {
      const interval = setInterval(() => {
        if (camera.videoRef.current) {
          contextDetection.processFrame(camera.videoRef.current);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [camera.isActive, contextDetection.processFrame]);

  // Pass detected context to parent
  useEffect(() => {
    if (contextDetection.detectedContext) {
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
            <h3 className="font-semibold text-slate-800">Camera Feed</h3>
            <p className="text-sm text-slate-600">
              {camera.isActive ? 'Live context detection active' : 'Camera inactive'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contextDetection.isProcessing && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Analyzing
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
              <p className="text-slate-500">Camera feed will appear here</p>
            </div>
          </div>
        )}

        {camera.isActive && (
          <div className="absolute top-2 right-2 flex gap-2">
            <Badge variant="default" className="bg-green-500 text-white">
              Live
            </Badge>
            {contextDetection.detectedContext && (
              <Badge variant="secondary">
                {Math.round(contextDetection.detectedContext.confidence * 100)}% confident
              </Badge>
            )}
          </div>
        )}
      </div>

      {contextDetection.detectedContext && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-800 mb-1">Current Context</h4>
          <p className="text-sm text-blue-700">
            {contextDetection.detectedContext.name}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Detected at {contextDetection.detectedContext.timestamp.toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  );
};

export default CameraFeed;
