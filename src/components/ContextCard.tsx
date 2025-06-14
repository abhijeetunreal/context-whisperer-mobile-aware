
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Zap } from 'lucide-react';

interface Context {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  confidence: number;
  color: string;
}

interface ContextCardProps {
  context: Context;
  isActive: boolean;
}

const ContextCard: React.FC<ContextCardProps> = ({ context, isActive }) => {
  const IconComponent = context.icon;

  return (
    <Card className="p-8 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${context.color} opacity-5 animate-pulse`} />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl bg-gradient-to-br ${context.color} shadow-lg`}>
              <IconComponent className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                {context.name}
              </h2>
              <p className="text-slate-600">{context.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {Math.round(context.confidence * 100)}% confidence
            </Badge>
            {isActive && (
              <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Detection
              </div>
            )}
          </div>
        </div>

        {/* Context Visualization */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-50 border">
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visual Analysis
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Scene complexity:</span>
                <span className="font-medium">Moderate</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Lighting conditions:</span>
                <span className="font-medium">Good</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Activity level:</span>
                <span className="font-medium">Active</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border">
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Temporal Context
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Duration:</span>
                <span className="font-medium">12 minutes</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Time of day:</span>
                <span className="font-medium">Afternoon</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pattern:</span>
                <span className="font-medium">Regular</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border">
            <h4 className="font-semibold text-slate-700 mb-2">Context Factors</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Environment</Badge>
              <Badge variant="secondary" className="text-xs">Activity</Badge>
              <Badge variant="secondary" className="text-xs">Objects</Badge>
              <Badge variant="secondary" className="text-xs">Patterns</Badge>
            </div>
          </div>
        </div>

        {/* Processing Indicator */}
        <div className="flex items-center justify-center py-4 border-t border-slate-200">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>Processing ambient context data...</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ContextCard;
