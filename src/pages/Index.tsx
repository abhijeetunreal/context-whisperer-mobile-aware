
import React, { useState, useEffect } from 'react';
import { Eye, Shield, Settings, Zap, BookOpen, Coffee, Users, Microscope, Car, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ContextCard from '@/components/ContextCard';
import PrivacyControls from '@/components/PrivacyControls';
import SuggestionPanel from '@/components/SuggestionPanel';

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const [contextHistory, setContextHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [privacyMode, setPrivacyMode] = useState('balanced');

  // Simulated contexts with rich data
  const contexts = [
    {
      id: 'office',
      name: 'Office Meeting',
      icon: Users,
      description: 'Conference room with presentation setup',
      confidence: 0.94,
      suggestions: [
        'Meeting agenda template for product review',
        'Enable focus mode to minimize distractions',
        'Set reminder to follow up on action items'
      ],
      color: 'from-blue-400 to-blue-600'
    },
    {
      id: 'coffee',
      name: 'Coffee Shop',
      icon: Coffee,
      description: 'Casual workspace environment',
      confidence: 0.87,
      suggestions: [
        'Switch to noise-canceling mode for better focus',
        'Suggested playlist: Ambient Focus',
        'Nearby wifi networks with good signal'
      ],
      color: 'from-amber-400 to-orange-500'
    },
    {
      id: 'reading',
      name: 'Reading Session',
      icon: BookOpen,
      description: 'Focused on physical book for 45 minutes',
      confidence: 0.91,
      suggestions: [
        'Would you like me to research related topics?',
        'Set a reading break reminder in 15 minutes',
        'Create notes section for key insights'
      ],
      color: 'from-green-400 to-emerald-600'
    },
    {
      id: 'lab',
      name: 'Laboratory',
      icon: Microscope,
      description: 'Research lab with specialized equipment',
      confidence: 0.96,
      suggestions: [
        'Safety protocol checklist for current equipment',
        'Log experiment parameters automatically',
        'Reference materials for current procedure'
      ],
      color: 'from-purple-400 to-violet-600'
    },
    {
      id: 'driving',
      name: 'Driving',
      icon: Car,
      description: 'Vehicle interior detected',
      confidence: 0.89,
      suggestions: [
        'Switch to hands-free mode',
        'Traffic update for your usual route',
        'Suggest podcast based on drive time'
      ],
      color: 'from-red-400 to-pink-500'
    },
    {
      id: 'home',
      name: 'Home Office',
      icon: Home,
      description: 'Personal workspace setup',
      confidence: 0.85,
      suggestions: [
        'Review today\'s schedule and priorities',
        'Adjust lighting for optimal productivity',
        'Suggest break activities based on time of day'
      ],
      color: 'from-indigo-400 to-purple-500'
    }
  ];

  // Simulate context detection
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
      
      // Only update if context actually changed
      if (!currentContext || currentContext.id !== randomContext.id) {
        setCurrentContext(randomContext);
        setSuggestions(randomContext.suggestions);
        
        // Add to history
        setContextHistory(prev => [
          {
            ...randomContext,
            timestamp: new Date(),
            duration: Math.floor(Math.random() * 60) + 5 // 5-65 minutes
          },
          ...prev.slice(0, 9) // Keep last 10 entries
        ]);
      }
    }, 8000); // Change context every 8 seconds for demo

    return () => clearInterval(interval);
  }, [isActive, currentContext]);

  const handleToggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      // Start with a random context
      const randomContext = contexts[Math.floor(Math.random() * contexts.length)];
      setCurrentContext(randomContext);
      setSuggestions(randomContext.suggestions);
    } else {
      setCurrentContext(null);
      setSuggestions([]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="relative">
              <Eye className="w-8 h-8 text-slate-700" />
              {isActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
              Ambient Context Engine
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            AI-powered situational awareness that provides proactive, context-aware suggestions 
            without needing prompts. Privacy-first ambient intelligence.
          </p>
        </div>

        {/* Privacy & Controls Bar */}
        <div className="flex justify-between items-center mb-8 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200">
          <div className="flex items-center gap-4">
            <Badge variant={isActive ? "default" : "secondary"} className="px-3 py-1">
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Shield className="w-4 h-4" />
              Privacy Mode: {privacyMode}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PrivacyControls 
              privacyMode={privacyMode} 
              setPrivacyMode={setPrivacyMode} 
            />
            <Button
              onClick={handleToggleActive}
              className={`px-6 py-2 ${
                isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              <Zap className="w-4 h-4 mr-2" />
              {isActive ? 'Deactivate' : 'Activate ACE'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Current Context - Main Display */}
          <div className="lg:col-span-2">
            {currentContext ? (
              <ContextCard 
                context={currentContext}
                isActive={isActive}
              />
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-slate-300">
                <Eye className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Ambient Context Engine Inactive
                </h3>
                <p className="text-slate-500 mb-6">
                  Activate ACE to begin ambient situational awareness and receive proactive suggestions.
                </p>
                <Button onClick={handleToggleActive} className="bg-blue-500 hover:bg-blue-600">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Context Detection
                </Button>
              </Card>
            )}

            {/* Suggestions Panel */}
            {suggestions.length > 0 && (
              <div className="mt-6">
                <SuggestionPanel 
                  suggestions={suggestions}
                  context={currentContext}
                />
              </div>
            )}
          </div>

          {/* Context History Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Recent Contexts
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {contextHistory.length > 0 ? (
                  contextHistory.map((context, index) => (
                    <div 
                      key={`${context.id}-${index}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-gradient-to-r ${context.color}`}>
                        <context.icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-700 truncate">
                          {context.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {context.duration}m ago
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No context history yet
                  </p>
                )}
              </div>
            </Card>

            {/* Privacy Information */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-800">
                <Shield className="w-5 h-5" />
                Privacy First
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• All processing happens on-device</p>
                <p>• No images stored or transmitted</p>
                <p>• Anonymized, low-resolution analysis only</p>
                <p>• Full control over activation and data</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
