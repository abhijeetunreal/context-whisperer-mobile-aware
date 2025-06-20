
import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Shield, Settings, Zap, BookOpen, Coffee, Users, Microscope, Car, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ContextCard from '@/components/ContextCard';
import PrivacyControls from '@/components/PrivacyControls';
import SuggestionPanel from '@/components/SuggestionPanel';
import CameraFeed from '@/components/CameraFeed';
import AccessibilityControls from '@/components/AccessibilityControls';
import NotesReminders from '@/components/NotesReminders';

interface Note {
  id: string;
  content: string;
  timestamp: Date;
  context?: string;
}

interface Reminder {
  id: string;
  content: string;
  timestamp: Date;
  context?: string;
  completed: boolean;
}

const Index = () => {
  const [isActive, setIsActive] = useState(false);
  const [currentContext, setCurrentContext] = useState(null);
  const [contextHistory, setContextHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [privacyMode, setPrivacyMode] = useState('balanced');
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // Accessibility states
  const [apiKey, setApiKey] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Context mapping with enhanced suggestions
  const contextMapping = {
    'office': {
      id: 'office',
      name: 'Office Environment',
      icon: Users,
      description: 'Professional workspace detected',
      suggestions: [
        'Enable focus mode to minimize distractions',
        'Check your calendar for upcoming meetings',
        'Set reminder to follow up on action items',
        'Take a 5-minute break to rest your eyes',
        'Review and organize your workspace'
      ],
      color: 'from-blue-400 to-blue-600'
    },
    'outdoor': {
      id: 'outdoor',
      name: 'Outdoor Scene',
      icon: Coffee,
      description: 'Outdoor environment detected',
      suggestions: [
        'Weather update for your location',
        'Nearby points of interest',
        'Outdoor activity suggestions',
        'Check UV index and sun protection',
        'Take photos of interesting sights'
      ],
      color: 'from-green-400 to-emerald-600'
    },
    'reading': {
      id: 'reading',
      name: 'Reading Area',
      icon: BookOpen,
      description: 'Reading or study environment',
      suggestions: [
        'Set a reading break reminder in 15 minutes',
        'Create notes section for key insights',
        'Adjust screen brightness for better reading',
        'Use the Pomodoro technique for focused study',
        'Bookmark important pages or sections'
      ],
      color: 'from-purple-400 to-violet-600'
    },
    'meeting': {
      id: 'meeting',
      name: 'Meeting Space',
      icon: Users,
      description: 'Meeting or conference setup',
      suggestions: [
        'Meeting agenda template available',
        'Enable presentation mode',
        'Mute notifications during meeting',
        'Prepare notes for meeting discussion',
        'Set follow-up reminders for action items'
      ],
      color: 'from-indigo-400 to-purple-500'
    },
    'low-light': {
      id: 'low-light',
      name: 'Low Light Environment',
      icon: Home,
      description: 'Dimly lit space detected',
      suggestions: [
        'Adjust display brightness automatically',
        'Enable dark mode for better visibility',
        'Suggest optimal lighting for current activity',
        'Consider using voice commands in low light',
        'Set up ambient lighting for comfort'
      ],
      color: 'from-slate-400 to-slate-600'
    },
    'kitchen': {
      id: 'kitchen',
      name: 'Kitchen Area',
      icon: Coffee,
      description: 'Kitchen environment detected',
      suggestions: [
        'Recipe suggestions based on visible ingredients',
        'Timer for cooking activities',
        'Safety reminders for kitchen tasks',
        'Meal planning and grocery list creation',
        'Nutrition tracking for prepared meals'
      ],
      color: 'from-orange-400 to-red-500'
    },
    'general': {
      id: 'general',
      name: 'General Environment',
      icon: Eye,
      description: 'Standard environment detected',
      suggestions: [
        'Context-aware suggestions will appear here',
        'Optimize settings based on surroundings',
        'Personalized recommendations available',
        'Explore voice commands for accessibility',
        'Set up custom context preferences'
      ],
      color: 'from-gray-400 to-gray-600'
    }
  };

  // Notes and Reminders Management
  const handleAddNote = useCallback((content: string, context?: string) => {
    const newNote: Note = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      context
    };
    setNotes(prev => [newNote, ...prev]);
  }, []);

  const handleAddReminder = useCallback((content: string, context?: string) => {
    const newReminder: Reminder = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      context,
      completed: false
    };
    setReminders(prev => [newReminder, ...prev]);
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  }, []);

  const handleDeleteReminder = useCallback((id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  }, []);

  const handleToggleReminder = useCallback((id: string) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id 
        ? { ...reminder, completed: !reminder.completed }
        : reminder
    ));
  }, []);

  const handleUpdateNote = useCallback((id: string, content: string) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, content }
        : note
    ));
  }, []);

  const handleToggleActive = () => {
    setIsActive(!isActive);
    if (!isActive) {
      console.log('Starting Ambient Context Engine...');
    } else {
      console.log('Stopping Ambient Context Engine...');
      setCurrentContext(null);
      setSuggestions([]);
    }
  };

  const handleContextDetected = useCallback((detectedContext) => {
    console.log('Context detected in main app:', detectedContext);
    
    // Map detected context to our rich context data
    const contextData = contextMapping[detectedContext.id] || contextMapping['general'];
    const enrichedContext = {
      ...contextData,
      confidence: detectedContext.confidence,
      timestamp: detectedContext.timestamp,
      objects: detectedContext.objects,
      description: detectedContext.description
    };

    // Only update if context actually changed
    if (!currentContext || currentContext.id !== enrichedContext.id) {
      setCurrentContext(enrichedContext);
      setSuggestions(enrichedContext.suggestions || []);
      
      // Add to history
      setContextHistory(prev => [
        {
          ...enrichedContext,
          duration: Math.floor(Math.random() * 60) + 5 // 5-65 minutes
        },
        ...prev.slice(0, 9) // Keep last 10 entries
      ]);
    }
  }, [currentContext]);

  const handleStopSpeaking = () => {
    console.log('Stop speaking requested');
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
            AI-powered situational awareness with voice descriptions for accessibility. 
            Privacy-first ambient intelligence with on-device processing.
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
          <div className="lg:col-span-2 space-y-6">
            {/* Accessibility Controls */}
            <AccessibilityControls
              apiKey={apiKey}
              setApiKey={setApiKey}
              voiceEnabled={voiceEnabled}
              setVoiceEnabled={setVoiceEnabled}
              isSpeaking={false}
              onStopSpeaking={handleStopSpeaking}
            />

            {/* Camera Feed */}
            <CameraFeed 
              isActive={isActive}
              onToggle={handleToggleActive}
              onContextDetected={handleContextDetected}
              voiceEnabled={voiceEnabled}
              apiKey={apiKey}
            />

            {/* Context Display */}
            {currentContext ? (
              <ContextCard 
                context={currentContext}
                isActive={isActive}
              />
            ) : (
              <Card className="p-12 text-center border-2 border-dashed border-slate-300">
                <Eye className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Waiting for Context Detection
                </h3>
                <p className="text-slate-500 mb-6">
                  Activate the camera to begin real-time ambient context analysis with voice descriptions for accessibility.
                </p>
                <Button onClick={handleToggleActive} className="bg-blue-500 hover:bg-blue-600">
                  <Zap className="w-4 h-4 mr-2" />
                  Start Camera & Detection
                </Button>
              </Card>
            )}

            {/* Suggestions Panel */}
            {suggestions.length > 0 && currentContext && (
              <SuggestionPanel 
                suggestions={suggestions}
                context={currentContext}
                onAddNote={handleAddNote}
                onAddReminder={handleAddReminder}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes & Reminders */}
            <NotesReminders
              notes={notes}
              reminders={reminders}
              onAddNote={handleAddNote}
              onAddReminder={handleAddReminder}
              onDeleteNote={handleDeleteNote}
              onDeleteReminder={handleDeleteReminder}
              onToggleReminder={handleToggleReminder}
              onUpdateNote={handleUpdateNote}
            />

            {/* Context History */}
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
                          {Math.round(context.confidence * 100)}% confidence
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
                Privacy & Accessibility
              </h3>
              <div className="space-y-2 text-sm text-blue-700">
                <p>• All processing happens on-device</p>
                <p>• Camera feed never stored or transmitted</p>
                <p>• Real-time analysis with immediate disposal</p>
                <p>• Voice descriptions for visual accessibility</p>
                <p>• Full control over activation and data</p>
                <p>• Clear visual and audio indicators when active</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
