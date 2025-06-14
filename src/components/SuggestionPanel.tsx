
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight, Check, X, Sparkles } from 'lucide-react';

interface SuggestionPanelProps {
  suggestions: string[];
  context: {
    name: string;
    color: string;
  };
}

const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ suggestions, context }) => {
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<number>>(new Set());

  const handleAccept = (index: number) => {
    setAcceptedSuggestions(prev => new Set([...prev, index]));
  };

  const handleDismiss = (index: number) => {
    setDismissedSuggestions(prev => new Set([...prev, index]));
  };

  const activeSuggestions = suggestions.filter((_, index) => 
    !dismissedSuggestions.has(index) && !acceptedSuggestions.has(index)
  );

  return (
    <Card className="p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${context.color} opacity-10 rounded-full blur-2xl`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${context.color}`}>
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-800">
              Proactive Suggestions
            </h3>
            <p className="text-slate-600 text-sm">
              Context-aware recommendations for {context.name}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Generated
          </Badge>
        </div>

        {activeSuggestions.length > 0 ? (
          <div className="space-y-4">
            {activeSuggestions.map((suggestion, originalIndex) => {
              const index = suggestions.indexOf(suggestion);
              return (
                <div 
                  key={index}
                  className="group p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-200 hover:shadow-md bg-white/50"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-slate-700 font-medium mb-2">
                        {suggestion}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Contextual
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Proactive
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        onClick={() => handleAccept(index)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 h-8"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDismiss(index)}
                        className="px-3 py-1 h-8"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">
              {suggestions.length === 0 
                ? "No suggestions available for current context"
                : "All suggestions processed"
              }
            </p>
          </div>
        )}

        {/* Accepted Suggestions Summary */}
        {acceptedSuggestions.size > 0 && (
          <div className="mt-6 p-4 rounded-xl bg-green-50 border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Accepted Actions ({acceptedSuggestions.size})
            </h4>
            <div className="space-y-1">
              {Array.from(acceptedSuggestions).map(index => (
                <p key={index} className="text-green-700 text-sm">
                  • {suggestions[index]}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Generation Info */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Generated based on ambient context analysis</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Real-time updates active</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SuggestionPanel;
