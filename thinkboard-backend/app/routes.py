# app/routes.py
from flask import Blueprint, request, jsonify
from .models import Note, Folder
from . import db
import time

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Note Routes [No Changes] ---
@api_bp.route('/notes', methods=['POST'])
def create_note():
    data = request.get_json()
    text = data.get('text')
    if not text or not text.strip():
        return jsonify({'error': 'Note text cannot be empty'}), 400
    new_note = Note(text=text)
    db.session.add(new_note)
    db.session.commit()
    return jsonify(new_note.to_dict()), 201

@api_bp.route('/notes', methods=['GET'])
def get_notes():
    notes = Note.query.order_by(Note.timestamp.desc()).all()
    return jsonify([note.to_dict() for note in notes])

@api_bp.route('/notes/<int:note_id>', methods=['PUT'])
def update_note(note_id):
    note = Note.query.get_or_404(note_id)
    data = request.get_json()
    if 'text' in data:
        note.text = data['text']
    if 'folder_id' in data:
        if data['folder_id'] is not None and not Folder.query.get(data['folder_id']):
            return jsonify({'error': 'Folder not found'}), 404
        note.folder_id = data['folder_id']
    note.timestamp = int(time.time())
    db.session.commit()
    return jsonify(note.to_dict())

@api_bp.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    note = Note.query.get_or_404(note_id)
    db.session.delete(note)
    db.session.commit()
    return '', 204

# --- Folder Routes ---
@api_bp.route('/folders', methods=['POST'])
def create_folder():
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({'error': 'Folder name cannot be empty'}), 400
    new_folder = Folder(name=name)
    db.session.add(new_folder)
    db.session.commit()
    return jsonify(new_folder.to_dict()), 201

@api_bp.route('/folders', methods=['GET'])
def get_folders():
    folders = Folder.query.order_by(Folder.name.asc()).all()
    return jsonify([folder.to_dict() for folder in folders])

# NEW ROUTE TO GET A SINGLE FOLDER'S DETAILS
@api_bp.route('/folders/<int:folder_id>', methods=['GET'])
def get_folder(folder_id):
    folder = Folder.query.get_or_404(folder_id)
    return jsonify(folder.to_dict())

@api_bp.route('/folders/<int:folder_id>', methods=['PUT'])
def update_folder(folder_id):
    folder = Folder.query.get_or_404(folder_id)
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({'error': 'Folder name cannot be empty'}), 400
    folder.name = name
    db.session.commit()
    return jsonify(folder.to_dict())

@api_bp.route('/folders/<int:folder_id>', methods=['DELETE'])
def delete_folder(folder_id):
    folder = Folder.query.get_or_404(folder_id)
    db.session.delete(folder)
    db.session.commit()
    return '', 204