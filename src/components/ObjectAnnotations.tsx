
import React from 'react';
import { Badge } from '@/components/ui/badge';

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

interface ObjectAnnotationsProps {
  objects: DetectedObject[];
  videoWidth: number;
  videoHeight: number;
  containerWidth: number;
  containerHeight: number;
}

const ObjectAnnotations: React.FC<ObjectAnnotationsProps> = ({
  objects,
  videoWidth,
  videoHeight,
  containerWidth,
  containerHeight
}) => {
  if (!objects.length || !videoWidth || !videoHeight || !containerWidth || !containerHeight) {
    return null;
  }

  // Calculate scaling factors
  const scaleX = containerWidth / videoWidth;
  const scaleY = containerHeight / videoHeight;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {objects.map((obj, index) => {
        const x = obj.boundingBox.x * scaleX;
        const y = obj.boundingBox.y * scaleY;
        const width = obj.boundingBox.width * scaleX;
        const height = obj.boundingBox.height * scaleY;

        // Enhanced color coding based on tracking state
        const isTracked = obj.persistenceCount > 3;
        const isNewObject = obj.persistenceCount <= 2;
        const isMoving = obj.velocity && (Math.abs(obj.velocity.x) > 5 || Math.abs(obj.velocity.y) > 5);
        
        let borderColor = 'border-green-400';
        let bgColor = 'bg-green-400/15';
        let badgeColor = 'bg-green-500';
        let borderStyle = 'border-2';
        
        if (isTracked) {
          borderColor = 'border-blue-400';
          bgColor = 'bg-blue-400/15';
          badgeColor = 'bg-blue-500';
          borderStyle = 'border-2';
        }
        
        if (isNewObject) {
          borderColor = 'border-yellow-400';
          bgColor = 'bg-yellow-400/15';
          badgeColor = 'bg-yellow-500';
          borderStyle = 'border-2 border-dashed';
        }
        
        if (isMoving) {
          borderColor = 'border-orange-400';
          bgColor = 'bg-orange-400/15';
          badgeColor = 'bg-orange-500';
          borderStyle = 'border-2';
        }

        return (
          <div key={obj.id || `obj-${index}`}>
            {/* Enhanced bounding box with tracking indicators */}
            <div
              className={`absolute ${borderStyle} ${borderColor} ${bgColor} rounded-lg`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            />
            
            {/* Tracking ID indicator for persistent objects */}
            {obj.trackingId && isTracked && (
              <div
                className="absolute z-10"
                style={{
                  left: `${x + 2}px`,
                  top: `${y + 2}px`,
                }}
              >
                <div className={`w-6 h-6 rounded-full ${badgeColor} text-white text-xs flex items-center justify-center font-bold shadow-lg`}>
                  {obj.trackingId}
                </div>
              </div>
            )}
            
            {/* Enhanced label with tracking and confidence info */}
            <div
              className="absolute z-10"
              style={{
                left: `${x}px`,
                top: `${Math.max(0, y - 32)}px`,
              }}
            >
              <Badge 
                variant="default" 
                className={`${badgeColor} text-white text-xs font-medium shadow-lg`}
              >
                {obj.name} {Math.round(obj.confidence * 100)}%
                {obj.persistenceCount > 1 && ` ×${obj.persistenceCount}`}
                {isMoving && ' 🔄'}
                {isNewObject && ' ✨'}
              </Badge>
            </div>
            
            {/* Velocity indicator for moving objects */}
            {isMoving && obj.velocity && (
              <div
                className="absolute z-10"
                style={{
                  left: `${x + width/2}px`,
                  top: `${y + height/2}px`,
                }}
              >
                <div 
                  className="w-8 h-1 bg-red-500 transform origin-left shadow-md"
                  style={{
                    transform: `rotate(${Math.atan2(obj.velocity.y, obj.velocity.x) * 180 / Math.PI}deg) scaleX(${Math.min(Math.sqrt(obj.velocity.x * obj.velocity.x + obj.velocity.y * obj.velocity.y) / 8, 4)})`
                  }}
                />
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-600 rounded-full"></div>
              </div>
            )}
            
            {/* Persistence indicator */}
            {obj.persistenceCount > 5 && (
              <div
                className="absolute z-10"
                style={{
                  left: `${x + width - 20}px`,
                  top: `${y + 2}px`,
                }}
              >
                <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ObjectAnnotations;
