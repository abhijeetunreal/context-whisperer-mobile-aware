
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
  if (!objects.length || !videoWidth || !videoHeight) return null;

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

        // Color coding based on persistence and tracking
        const isTracked = obj.persistenceCount > 2;
        const isMoving = obj.velocity && (Math.abs(obj.velocity.x) > 3 || Math.abs(obj.velocity.y) > 3);
        
        let borderColor = 'border-green-400';
        let bgColor = 'bg-green-400/10';
        let badgeColor = 'bg-green-500';
        
        if (isTracked) {
          borderColor = 'border-blue-400';
          bgColor = 'bg-blue-400/10';
          badgeColor = 'bg-blue-500';
        }
        
        if (isMoving) {
          borderColor = 'border-orange-400';
          bgColor = 'bg-orange-400/10';
          badgeColor = 'bg-orange-500';
        }

        return (
          <div key={obj.id || index}>
            {/* Enhanced bounding box with tracking indicators */}
            <div
              className={`absolute border-2 ${borderColor} ${bgColor} rounded`}
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            />
            
            {/* Tracking ID indicator */}
            {obj.trackingId && (
              <div
                className="absolute"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                }}
              >
                <div className={`w-6 h-6 rounded-full ${badgeColor} text-white text-xs flex items-center justify-center font-bold`}>
                  {obj.trackingId}
                </div>
              </div>
            )}
            
            {/* Enhanced label with tracking info */}
            <div
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${Math.max(0, y - 28)}px`,
              }}
            >
              <Badge 
                variant="default" 
                className={`${badgeColor} text-white text-xs font-medium shadow-lg`}
              >
                {obj.name} {Math.round(obj.confidence * 100)}%
                {obj.persistenceCount > 1 && ` ×${obj.persistenceCount}`}
                {isMoving && ' 🔄'}
              </Badge>
            </div>
            
            {/* Velocity indicator for moving objects */}
            {isMoving && obj.velocity && (
              <div
                className="absolute"
                style={{
                  left: `${x + width/2}px`,
                  top: `${y + height/2}px`,
                }}
              >
                <div 
                  className="w-6 h-1 bg-red-500 transform origin-left"
                  style={{
                    transform: `rotate(${Math.atan2(obj.velocity.y, obj.velocity.x) * 180 / Math.PI}deg) scaleX(${Math.min(Math.sqrt(obj.velocity.x * obj.velocity.x + obj.velocity.y * obj.velocity.y) / 10, 3)})`
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ObjectAnnotations;
