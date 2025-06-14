
import { useState, useRef, useEffect } from 'react';

interface CameraHookReturn {
  isSupported: boolean;
  isActive: boolean;
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export const useCamera = (): CameraHookReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Check if camera is supported
    setIsSupported(!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
  }, []);

  const startCamera = async () => {
    if (!isSupported) {
      setError('Camera not supported on this device');
      return;
    }

    try {
      setError(null);
      console.log('Requesting camera access...');
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment' // Use back camera if available
        },
        audio: false
      });

      setStream(mediaStream);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Camera stream connected');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permission.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported in this browser.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Unknown camera error occurred');
      }
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      console.log('Camera stream stopped');
    }
    setIsActive(false);
    setError(null);
  };

  return {
    isSupported,
    isActive,
    stream,
    videoRef,
    error,
    startCamera,
    stopCamera
  };
};
