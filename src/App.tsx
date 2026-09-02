import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Search, X } from 'lucide-react';
import { Note } from './types';
import { motion, AnimatePresence } from 'motion/react';

function App() {
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('noteflow_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    localStorage.setItem('noteflow_notes', JSON.stringify(notes));
  }, [notes]);

  const handleCreateNew = () => {
    setSelectedNote(null);
    setEditTitle('');
    setEditContent('');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!editTitle.trim() && !editContent.trim()) {
      setIsEditing(false);
      return;
    }

    const now = Date.now();
    
    if (selectedNote) {
      setNotes(notes.map(n => n.id === selectedNote.id ? {
        ...n,
        title: editTitle || 'Untitled',
        content: editContent,
        updatedAt: now
      } : n));
      setIsEditing(false);
      setSelectedNote({
        ...selectedNote,
        title: editTitle || 'Untitled',
        content: editContent,
        updatedAt: now
      });
    } else {
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: editTitle || 'Untitled',
        content: editContent,
        createdAt: now,
        updatedAt: now
      };
      setNotes([newNote, ...notes]);
      setIsEditing(false);
      setSelectedNote(newNote);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotes(notes.filter(n => n.id !== id));
    if (selectedNote?.id === id) {
      setSelectedNote(null);
      setIsEditing(false);
    }
  };

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
  };
  
  const handleEditNote = () => {
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
      setIsEditing(true);
    }
  };

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#faf9f7] text-neutral-800 font-sans">
      {/* Sidebar */}
      <div className="w-80 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold tracking-tight">NoteFlow</h1>
            <button 
              onClick={handleCreateNew}
              className="p-2 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-neutral-400" size={16} />
            <input 
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-neutral-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-neutral-200 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-sm">
              {searchQuery ? 'No notes match your search.' : 'No notes yet. Create one!'}
            </div>
          ) : (
            <AnimatePresence>
              {filteredNotes.map(note => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleSelectNote(note)}
                  className={`p-4 border-b border-neutral-100 cursor-pointer transition-colors group relative ${selectedNote?.id === note.id ? 'bg-neutral-50' : 'hover:bg-neutral-50'}`}
                >
                  <h3 className="font-medium text-neutral-900 mb-1 truncate">{note.title}</h3>
                  <p className="text-sm text-neutral-500 line-clamp-2">{note.content}</p>
                  
                  <button 
                    onClick={(e) => handleDelete(note.id, e)}
                    className="absolute right-4 top-4 p-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all rounded-md hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#faf9f7] overflow-hidden">
        {isEditing ? (
          <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <button 
                onClick={() => {
                  if (selectedNote) {
                    setIsEditing(false);
                  } else {
                    setIsEditing(false);
                    setSelectedNote(null);
                  }
                }}
                className="text-neutral-500 hover:text-neutral-900 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Save Note
              </button>
            </div>
            
            <input 
              type="text"
              placeholder="Note Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="text-4xl font-bold bg-transparent border-none outline-none mb-6 placeholder:text-neutral-300 text-neutral-900"
            />
            
            <textarea 
              placeholder="Start typing your note here..."
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none resize-none text-lg leading-relaxed text-neutral-700 placeholder:text-neutral-300 focus:outline-none"
            />
          </div>
        ) : selectedNote ? (
          <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-8 overflow-y-auto">
            <div className="flex justify-end mb-8">
              <button 
                onClick={handleEditNote}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors shadow-sm"
              >
                <Edit3 size={16} /> Edit Note
              </button>
            </div>
            <h1 className="text-4xl font-bold text-neutral-900 mb-6">{selectedNote.title}</h1>
            <div className="prose prose-neutral max-w-none text-lg text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {selectedNote.content || <span className="text-neutral-400 italic">No content</span>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400">
            <Edit3 size={48} className="mb-4 text-neutral-300" strokeWidth={1.5} />
            <h2 className="text-xl font-medium text-neutral-900 mb-2">NoteFlow</h2>
            <p>Select a note from the sidebar or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
