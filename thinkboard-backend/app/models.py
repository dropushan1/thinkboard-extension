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