# app/routes.py
from flask import Blueprint, request, jsonify
from .models import Note, Folder, ChatThread, ChatMessage, ChatFolder, StudyWord
from . import db
import time
from google import genai

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Gemini API Configuration ---
API_KEY = "AIzaSyAlAylJfvQd15zgdymkHagWW-5nVjQtsac"
client = genai.Client(api_key=API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

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

# --- Folder Routes [No Changes] ---
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

# --- Study Word Routes [No Changes] ---
@api_bp.route('/words', methods=['GET'])
def get_words():
    category = request.args.get('category')
    if not category:
        return jsonify({'error': 'Category query parameter is required'}), 400
    words = StudyWord.query.filter_by(category=category).order_by(StudyWord.timestamp.desc()).all()
    return jsonify([word.to_dict() for word in words])

@api_bp.route('/words', methods=['POST'])
def create_word():
    data = request.get_json()
    word_text = data.get('word_text')
    category = data.get('category')
    if not word_text or not category:
        return jsonify({'error': 'word_text and category are required'}), 400
    new_word = StudyWord(word_text=word_text, category=category)
    db.session.add(new_word)
    db.session.commit()
    return jsonify(new_word.to_dict()), 201

@api_bp.route('/words/<int:word_id>', methods=['PUT'])
def update_word(word_id):
    word = StudyWord.query.get_or_404(word_id)
    data = request.get_json()
    if 'word_text' in data:
        word.word_text = data['word_text']
    if 'notes' in data:
        word.notes = data['notes']
    if 'status' in data:
        word.status = data['status']
    word.timestamp = int(time.time())
    db.session.commit()
    return jsonify(word.to_dict())

@api_bp.route('/words/<int:word_id>', methods=['DELETE'])
def delete_word(word_id):
    word = StudyWord.query.get_or_404(word_id)
    db.session.delete(word)
    db.session.commit()
    return '', 204

# --- CHAT ROUTES ---
@api_bp.route('/chat/folders', methods=['POST'])
def create_chat_folder():
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({'error': 'Folder name cannot be empty'}), 400
    new_folder = ChatFolder(name=name)
    db.session.add(new_folder)
    db.session.commit()
    return jsonify(new_folder.to_dict()), 201

@api_bp.route('/chat/folders/<int:folder_id>', methods=['PUT'])
def update_chat_folder(folder_id):
    folder = ChatFolder.query.get_or_404(folder_id)
    data = request.get_json()
    name = data.get('name')
    if not name or not name.strip():
        return jsonify({'error': 'Folder name cannot be empty'}), 400
    folder.name = name
    db.session.commit()
    return jsonify(folder.to_dict())

@api_bp.route('/chat/folders/<int:folder_id>', methods=['DELETE'])
def delete_chat_folder(folder_id):
    folder = ChatFolder.query.get_or_404(folder_id)
    for thread in folder.chat_threads:
        thread.folder_id = None
    db.session.delete(folder)
    db.session.commit()
    return '', 204

@api_bp.route('/chat/threads', methods=['GET'])
def get_chat_data():
    folders = ChatFolder.query.order_by(ChatFolder.name.asc()).all()
    threads = ChatThread.query.order_by(ChatThread.timestamp.desc()).all()
    response_data = {"folders": [folder.to_dict() for folder in folders], "threads": [thread.to_dict() for thread in threads]}
    return jsonify(response_data)

# --- UPDATED: This route now also handles renaming a thread ---
@api_bp.route('/chat/threads/<int:thread_id>', methods=['PUT'])
def update_chat_thread(thread_id):
    thread = ChatThread.query.get_or_404(thread_id)
    data = request.get_json()
    
    if 'folder_id' in data:
        folder_id = data['folder_id']
        if folder_id is not None and not ChatFolder.query.get(folder_id):
            return jsonify({'error': 'Folder not found'}), 404
        thread.folder_id = folder_id

    if 'title' in data:
        title = data.get('title')
        if not title or not title.strip():
            return jsonify({'error': 'Title cannot be empty'}), 400
        thread.title = title

    db.session.commit()
    return jsonify(thread.to_dict())

@api_bp.route('/chat/threads/<int:thread_id>/messages', methods=['GET'])
def get_chat_thread_messages(thread_id):
    thread = ChatThread.query.get_or_404(thread_id)
    messages = ChatMessage.query.filter_by(thread_id=thread.id).order_by(ChatMessage.timestamp.asc()).all()
    return jsonify([msg.to_dict() for msg in messages])

@api_bp.route('/chat/threads/<int:thread_id>', methods=['DELETE'])
def delete_chat_thread(thread_id):
    thread = ChatThread.query.get_or_404(thread_id)
    db.session.delete(thread)
    db.session.commit()
    return '', 204

@api_bp.route('/chat/message', methods=['POST'])
def send_chat_message():
    data = request.get_json()
    user_message = data.get('user_message')
    thread_id = data.get('thread_id')
    filters = data.get('filters', [])
    if not user_message:
        return jsonify({'error': 'Message content is required'}), 400
    if thread_id:
        thread = ChatThread.query.get(thread_id)
        if not thread:
            return jsonify({'error': 'Chat thread not found'}), 404
    else:
        title = user_message[:50] + "..." if len(user_message) > 50 else user_message
        thread = ChatThread(title=title)
        db.session.add(thread)
        db.session.commit() 
    user_msg_obj = ChatMessage(content=user_message, role='user', thread_id=thread.id)
    db.session.add(user_msg_obj)
    thread.timestamp = int(time.time())
    system_instruction = "\n\n--- INSTRUCTION SET ---\n"
    if "Short Reply" in filters:
        system_instruction += "Keep your response concise and strictly to the point.\n"
    if "Learning" in filters:
        system_instruction += "Explain the topic using simple terms, analogies, and a beginner-friendly structure.\n"
    if "Detailed Reply" in filters:
        system_instruction += "Provide a comprehensive and highly detailed response.\n"
    system_instruction += "-----------------------\n"
    history = ChatMessage.query.filter_by(thread_id=thread.id).order_by(ChatMessage.timestamp.asc()).all()
    conversation_context = ""
    for msg in history:
        conversation_context += f"<{msg.role.upper()}>: {msg.content}\n"
    final_prompt = (
        system_instruction + 
        "\n--- CONVERSATION HISTORY ---\n" + 
        conversation_context +
        f"<USER>: {user_message}"
    )
    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=final_prompt)
        model_response_text = response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        db.session.rollback()
        return jsonify({'error': f'Failed to get response from AI model. Error: {str(e)}'}), 500
    model_msg_obj = ChatMessage(content=model_response_text, role='model', thread_id=thread.id)
    db.session.add(model_msg_obj)
    db.session.commit()
    return jsonify({
        'user_message': user_msg_obj.to_dict(),
        'model_message': model_msg_obj.to_dict(),
        'thread': thread.to_dict()
    }), 201