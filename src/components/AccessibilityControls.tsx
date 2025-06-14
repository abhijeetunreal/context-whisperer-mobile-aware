
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Volume2, VolumeX, Settings, Eye } from 'lucide-react';

interface AccessibilityControlsProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
}

const AccessibilityControls: React.FC<AccessibilityControlsProps> = ({
  apiKey,
  setApiKey,
  voiceEnabled,
  setVoiceEnabled,
  isSpeaking,
  onStopSpeaking
}) => {
  const [showApiKeyInput, setShowApiKeyInput] = useState(!apiKey);

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-100">
          <Eye className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-purple-800">Accessibility Features</h3>
          <p className="text-sm text-purple-600">Voice descriptions for visual content</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Voice Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {voiceEnabled ? (
              <Volume2 className="w-4 h-4 text-green-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span className="text-sm font-medium">Voice Descriptions</span>
            {isSpeaking && (
              <Badge variant="outline" className="text-xs">
                Speaking...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isSpeaking && (
              <Button
                size="sm"
                variant="outline"
                onClick={onStopSpeaking}
                className="text-xs"
              >
                Stop
              </Button>
            )}
            <Button
              size="sm"
              variant={voiceEnabled ? "default" : "outline"}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
            >
              {voiceEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="apiKey" className="text-sm font-medium">
              ElevenLabs API Key (Optional)
            </Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          
          {showApiKeyInput && (
            <div className="space-y-2">
              <Input
                id="apiKey"
                type="password"
                placeholder="Enter your ElevenLabs API key for better voice quality"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-slate-500">
                Without API key, browser's built-in speech synthesis will be used
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default AccessibilityControls;
