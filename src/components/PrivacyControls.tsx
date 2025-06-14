
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Shield, ChevronDown, Eye, EyeOff, Lock } from 'lucide-react';

interface PrivacyControlsProps {
  privacyMode: string;
  setPrivacyMode: (mode: string) => void;
}

const PrivacyControls: React.FC<PrivacyControlsProps> = ({ privacyMode, setPrivacyMode }) => {
  const privacyModes = [
    {
      id: 'minimal',
      name: 'Minimal Processing',
      description: 'Basic context detection only',
      icon: EyeOff,
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Standard context awareness',
      icon: Eye,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'enhanced',
      name: 'Enhanced Context',
      description: 'Detailed situational analysis',
      icon: Shield,
      color: 'bg-green-100 text-green-800 border-green-200'
    }
  ];

  const currentMode = privacyModes.find(mode => mode.id === privacyMode);
  const CurrentIcon = currentMode?.icon || Shield;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4" />
          <span className="hidden sm:inline">{currentMode?.name}</span>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-slate-800 mb-1">Privacy Controls</h3>
          <p className="text-xs text-slate-600">
            Adjust how much contextual data is processed
          </p>
        </div>
        
        {privacyModes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = privacyMode === mode.id;
          
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => setPrivacyMode(mode.id)}
              className="p-4 cursor-pointer"
            >
              <div className="flex items-start gap-3 w-full">
                <div className={`p-2 rounded-lg ${mode.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800">{mode.name}</span>
                    {isSelected && (
                      <Badge variant="default" className="text-xs px-2 py-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">{mode.description}</p>
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <div className="p-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
            <Lock className="w-3 h-3" />
            <span className="font-medium">Privacy Guarantees</span>
          </div>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• All processing happens locally</li>
            <li>• No data leaves your device</li>
            <li>• Images are never stored</li>
            <li>• Anonymized analysis only</li>
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PrivacyControls;
