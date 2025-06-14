
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Clock, Plus, Trash2, Edit, Save, X } from 'lucide-react';

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

interface NotesRemindersProps {
  notes: Note[];
  reminders: Reminder[];
  onAddNote: (content: string, context?: string) => void;
  onAddReminder: (content: string, context?: string) => void;
  onDeleteNote: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onToggleReminder: (id: string) => void;
  onUpdateNote: (id: string, content: string) => void;
}

const NotesReminders: React.FC<NotesRemindersProps> = ({
  notes,
  reminders,
  onAddNote,
  onAddReminder,
  onDeleteNote,
  onDeleteReminder,
  onToggleReminder,
  onUpdateNote
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'reminders'>('notes');
  const [newNote, setNewNote] = useState('');
  const [newReminder, setNewReminder] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleAddNote = () => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  };

  const handleAddReminder = () => {
    if (newReminder.trim()) {
      onAddReminder(newReminder.trim());
      setNewReminder('');
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = () => {
    if (editingNote && editContent.trim()) {
      onUpdateNote(editingNote, editContent.trim());
      setEditingNote(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent('');
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-r from-indigo-400 to-purple-500">
          <StickyNote className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-slate-800">
            Notes & Reminders
          </h3>
          <p className="text-slate-600 text-sm">
            Context-aware note taking and reminders
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === 'notes' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('notes')}
          className="flex items-center gap-2"
        >
          <StickyNote className="w-4 h-4" />
          Notes ({notes.length})
        </Button>
        <Button
          variant={activeTab === 'reminders' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('reminders')}
          className="flex items-center gap-2"
        >
          <Clock className="w-4 h-4" />
          Reminders ({reminders.filter(r => !r.completed).length})
        </Button>
      </div>

      {/* Notes Tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {/* Add New Note */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add a new note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>

          {/* Notes List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  {editingNote === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-700 mb-2">{note.content}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {note.context && (
                            <Badge variant="outline" className="text-xs">
                              {note.context}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {note.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditNote(note)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteNote(note.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <StickyNote className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">No notes yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {/* Add New Reminder */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add a new reminder..."
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              className="min-h-[80px]"
            />
            <Button
              onClick={handleAddReminder}
              disabled={!newReminder.trim()}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </div>

          {/* Reminders List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {reminders.length > 0 ? (
              reminders.map((reminder) => (
                <div 
                  key={reminder.id} 
                  className={`p-4 border rounded-lg ${
                    reminder.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={reminder.completed}
                      onChange={() => onToggleReminder(reminder.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className={`text-slate-700 mb-2 ${
                        reminder.completed ? 'line-through opacity-60' : ''
                      }`}>
                        {reminder.content}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {reminder.context && (
                            <Badge variant="outline" className="text-xs">
                              {reminder.context}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500">
                            {reminder.timestamp.toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteReminder(reminder.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500">No reminders yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default NotesReminders;
