# app/routes.py
from flask import Blueprint, request, jsonify
from .models import Note, Folder, ChatThread, ChatMessage, ChatFolder
from . import db
import time
# CRITICAL FIX: Using the exact import structure requested by the user
from google import genai

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Gemini API Configuration ---
API_KEY = "AIzaSyAlAylJfvQd15zgdymkHagWW-5nVjQtsac"
# CRITICAL FIX: Using the Client initialization requested by the user
client = genai.Client(api_key=API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"


# --- Note and Folder Routes [Omitted for brevity, assumed unchanged] ---

# --- NEW CHAT ROUTES ---

@api_bp.route('/chat/threads', methods=['GET'])
def get_chat_threads():
    threads = ChatThread.query.order_by(ChatThread.timestamp.desc()).all()
    return jsonify([thread.to_dict() for thread in threads])

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
    
    # 1. Thread Management
    if thread_id:
        thread = ChatThread.query.get(thread_id)
        if not thread:
            return jsonify({'error': 'Chat thread not found'}), 404
    else:
        # Create a new thread
        title = user_message[:50] + "..." if len(user_message) > 50 else user_message
        thread = ChatThread(title=title)
        db.session.add(thread)
        db.session.commit() 

    # 2. Save user message to DB
    user_msg_obj = ChatMessage(content=user_message, role='user', thread_id=thread.id)
    db.session.add(user_msg_obj)
    thread.timestamp = int(time.time())

    # 3. Construct Context and Prompt for Single-Shot API Call
    
    # Define Filter Instructions
    system_instruction = "\n\n--- INSTRUCTION SET ---\n"
    if "Short Reply" in filters:
        system_instruction += "Keep your response concise and strictly to the point.\n"
    if "Learning" in filters:
        system_instruction += "Explain the topic using simple terms, analogies, and a beginner-friendly structure.\n"
    if "Detailed Reply" in filters:
        system_instruction += "Provide a comprehensive and highly detailed response.\n"
    system_instruction += "-----------------------\n"
    
    # Build Conversation History
    history = ChatMessage.query.filter_by(thread_id=thread.id).order_by(ChatMessage.timestamp.asc()).all()
    
    conversation_context = ""
    for msg in history:
        # Format history as a clear conversation transcript
        conversation_context += f"<{msg.role.upper()}>: {msg.content}\n"

    # Assemble the final prompt payload
    # Note: We append the new message here, which is already saved in the DB, 
    # but we need it in the prompt to give context to the model.
    final_prompt = (
        system_instruction + 
        "\n--- CONVERSATION HISTORY ---\n" + 
        conversation_context +
        f"<USER>: {user_message}"
    )

    # 4. Call Gemini API using the specific required syntax
    try:
        # CRITICAL FIX: Using client.models.generate_content
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=final_prompt
        )
        model_response_text = response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Roll back user message insertion if AI call fails
        db.session.rollback()
        return jsonify({'error': f'Failed to get response from AI model. Error: {e}'}), 500

    # 5. Save model response to DB
    model_msg_obj = ChatMessage(content=model_response_text, role='model', thread_id=thread.id)
    db.session.add(model_msg_obj)
    db.session.commit()

    return jsonify({
        'user_message': user_msg_obj.to_dict(),
        'model_message': model_msg_obj.to_dict(),
        'thread': thread.to_dict()
    }), 201

# --- Remaining Note and Folder Routes (not shown, assumed unchanged) ---
# ... (your existing routes for notes/folders)