
import React from 'react';
import { Badge } from '@/components/ui/badge';

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

        return (
          <div key={index}>
            {/* Bounding box */}
            <div
              className="absolute border-2 border-green-400 bg-green-400/10 rounded"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                width: `${width}px`,
                height: `${height}px`,
              }}
            />
            
            {/* Label */}
            <div
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${Math.max(0, y - 28)}px`,
              }}
            >
              <Badge 
                variant="default" 
                className="bg-green-500 text-white text-xs font-medium shadow-lg"
              >
                {obj.name} {Math.round(obj.confidence * 100)}%
              </Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ObjectAnnotations;
