# app/models.py
from . import db
import time

class Folder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    notes = db.relationship('Note', backref='folder', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'note_ids': [note.id for note in self.notes]
        }

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(10000), nullable=False)
    timestamp = db.Column(db.Integer, nullable=False, default=lambda: int(time.time()))
    folder_id = db.Column(db.Integer, db.ForeignKey('folder.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'timestamp': self.timestamp,
            'folder_id': self.folder_id
        }

# --- CHAT MODELS ---

class ChatFolder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    chat_threads = db.relationship('ChatThread', backref='chat_folder', lazy=True)

    def to_dict(self):
        # UPDATED: Include thread IDs for easier frontend rendering
        return {
            'id': self.id,
            'name': self.name,
            'thread_ids': [thread.id for thread in self.chat_threads]
        }

class ChatThread(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False, default="New Chat")
    timestamp = db.Column(db.Integer, nullable=False, default=lambda: int(time.time()))
    messages = db.relationship('ChatMessage', backref='chat_thread', lazy=True, cascade="all, delete-orphan")
    folder_id = db.Column(db.Integer, db.ForeignKey('chat_folder.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'timestamp': self.timestamp,
            'folder_id': self.folder_id,
            'message_count': len(self.messages)
        }

class ChatMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(10), nullable=False) # "user" or "model"
    timestamp = db.Column(db.Integer, nullable=False, default=lambda: int(time.time()))
    thread_id = db.Column(db.Integer, db.ForeignKey('chat_thread.id'), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'role': self.role,
            'timestamp': self.timestamp,
            'thread_id': self.thread_id
        }

# --- STUDY WORD MODEL ---

class StudyWord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word_text = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False) # "Pronunciation", "Spelling", "Meaning"
    status = db.Column(db.String(50), nullable=False, default='Active') # "Active", "Medium", "Learned"
    notes = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.Integer, nullable=False, default=lambda: int(time.time()))

    def to_dict(self):
        return {
            'id': self.id,
            'word_text': self.word_text,
            'category': self.category,
            'status': self.status,
            'notes': self.notes,
            'timestamp': self.timestamp
        }