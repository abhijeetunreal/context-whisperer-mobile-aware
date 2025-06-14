
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

    // Stop existing stream first
    if (stream) {
      stopCamera();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      setError(null);
      console.log('Requesting camera access...');
      
      // Try different camera configurations
      const configs = [
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'environment'
          },
          audio: false
        },
        {
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            facingMode: 'user'
          },
          audio: false
        },
        {
          video: true,
          audio: false
        }
      ];

      let mediaStream = null;
      let lastError = null;

      for (const config of configs) {
        try {
          console.log('Trying camera config:', config);
          mediaStream = await navigator.mediaDevices.getUserMedia(config);
          break;
        } catch (configError) {
          console.log('Config failed, trying next:', configError);
          lastError = configError;
          continue;
        }
      }

      if (!mediaStream) {
        throw lastError || new Error('All camera configurations failed');
      }

      setStream(mediaStream);
      setIsActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not available'));
            return;
          }

          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            resolve(undefined);
          };

          const onError = (e: Event) => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Video failed to load'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });

        console.log('Camera stream connected successfully');
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permission and reload the page.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported in this browser.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is busy or unavailable. Please close other apps using the camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Unknown camera error occurred');
      }
      setIsActive(false);
      
      // Clean up any partial stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setError(null);
    console.log('Camera stream stopped');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

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
