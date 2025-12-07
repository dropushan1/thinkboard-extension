# app/routes.py
from flask import Blueprint, request, jsonify
from .models import Note, Folder, ChatThread, ChatMessage, ChatFolder, StudyWord, CustomPrompt
from . import db
import time
import json 
from google import genai
import os # NEW IMPORT

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- Gemini API Configuration ---
# KEY IS RETRIEVED FROM THE .env FILE
API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    # This will raise an error if the .env file is missing or the key isn't set
    raise ValueError("GEMINI_API_KEY environment variable not set. Please check your .env file.")

client = genai.Client(api_key=API_KEY)
GEMINI_MODEL = "gemini-2.5-flash"

# --- Note Routes ---
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

# --- Study Word Routes ---
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
    # CHANGED: 'filters' are now replaced by 'system_prompt' logic but keeping it safe.
    # The new logic prefers 'system_prompt' explicitly sent by frontend.
    system_prompt = data.get('system_prompt') 
    
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

    # --- UPDATED PROMPT CONSTRUCTION ---
    if system_prompt and system_prompt.strip():
        final_system_instruction = f"\n\n--- SYSTEM INSTRUCTION ---\n{system_prompt}\n--------------------------\n"
    else:
        # Fallback to old behavior if no prompt meant to be "empty"
        final_system_instruction = ""

    history = ChatMessage.query.filter_by(thread_id=thread.id).order_by(ChatMessage.timestamp.asc()).all()
    conversation_context = ""
    for msg in history:
        conversation_context += f"<{msg.role.upper()}>: {msg.content}\n"
    final_prompt = (
        final_system_instruction + 
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

# --- NEW: GRAMMAR CORRECTION ROUTE ---
@api_bp.route('/grammar/correct', methods=['POST'])
def correct_grammar():
    data = request.get_json()
    text_to_correct = data.get('text')
    include_advice = data.get('include_advice', False)

    if not text_to_correct or not text_to_correct.strip():
        return jsonify({'error': 'Text to correct cannot be empty'}), 400

    # --- Prompt Engineering ---
    if include_advice:
        prompt = f"""
            You are a grammar correction assistant. Analyze the following text and provide a corrected version, along with advice and a list of specific mistakes.
            
            **CRITICAL INSTRUCTION: DO NOT alter the user's vocabulary, tone, or style. Maintain the original harshness or emotional content. Only correct errors in grammar, spelling, and punctuation.**

            Your output MUST be a valid JSON object with the following three keys: "corrected_text", "advice", and "mistakes".

            1.  `corrected_text`: The fully corrected version of the user's text.
            2.  `advice`: A brief, friendly summary of the main types of errors found (e.g., "I noticed a few run-on sentences and some spelling errors.").
            3.  `mistakes`: An array of objects, where each object has two keys: "original" (the incorrect word/phrase) and "corrected" (the fixed word/phrase). 
                **IMPORTANT: 'original' MUST be a single word or a very short phrase (max 2-3 words). NEVER return a full sentence here.**

            Example JSON structure:
            {{
              "corrected_text": "This is the corrected sentence.",
              "advice": "I corrected a spelling mistake and a grammatical error.",
              "mistakes": [
                {{ "original": "sentance", "corrected": "sentence" }},
                {{ "original": "This are", "corrected": "This is" }}
              ]
            }}

            --- TEXT TO CORRECT ---
            {text_to_correct}
            --- END OF TEXT ---
        """
    else:
        prompt = f"""
            You are a grammar correction assistant. Correct any spelling and grammar mistakes in the following text.
            **CRITICAL INSTRUCTION: DO NOT alter the user's vocabulary, tone, or style. Maintain the original harshness or emotional content. Only correct errors in grammar, spelling, and punctuation.**
            Return ONLY the corrected text, with no extra explanations, greetings, or formatting.

            --- TEXT TO CORRECT ---
            {text_to_correct}
            --- END OF TEXT ---
        """

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        
        if include_advice:
            # Clean the response to ensure it's valid JSON
            cleaned_response = response.text.strip().replace('```json', '').replace('```', '')
            # Parse the JSON string into a Python dictionary
            json_response = json.loads(cleaned_response)
            return jsonify(json_response)
        else:
            # For the simple case, return the text directly in a structured object
            return jsonify({'corrected_text': response.text.strip()})

    except Exception as e:
        print(f"Gemini API or JSON Parsing Error: {e}")
        return jsonify({'error': f'Failed to process the text. Error: {str(e)}'}), 500

# --- NEW: BATCH MEANING GENERATION ---
@api_bp.route('/words/generate-meanings', methods=['POST'])
def generate_meanings():
    data = request.get_json()
    word_ids = data.get('word_ids') # Optional list of IDs
    process_all_new = data.get('process_all_new', False)
    category = data.get('category') # NEW: Optional category filter

    words_to_process = []
    
    if process_all_new:
        # Get all words that don't have a meaning yet
        query = StudyWord.query.filter(
            (StudyWord.meaning == None) | (StudyWord.meaning == '')
        )
        if category:
            query = query.filter(StudyWord.category == category)
            
        words_to_process = query.all()
    elif word_ids:
        # Note: If category is provided here, we could also filter, but usually IDs are specific enough.
        # But to be safe and strictly follow "generate for meaning tab", we can enforce it if needed.
        # For now, let's assume if IDs are passed, the frontend knows what it's doing.
        # But "process_all_new" is where the bulk issue lies.
        words_to_process = StudyWord.query.filter(StudyWord.id.in_(word_ids)).all()
    
    if not words_to_process:
        # Differentiate between "nothing new" and "nothing at all" if useful, but a 0 count is enough.
        return jsonify({'message': 'No words to process', 'updated_count': 0}), 200

    # Batch them for Gemini
    words_list = [w.word_text for w in words_to_process]
    words_str = ", ".join(words_list)
    
    prompt = f"""
        Generate a short meaning and a short example sentence for the following words: {words_str}.
        
        Return ONLY a raw JSON list of objects. Do not include markdown formatting (like ```json ... ```).
        Each object must have:
        - "word": The word itself
        - "meaning": A very short definition (max 10 words)
        - "example": A very short example sentence (max 15 words)

        Example Output:
        [
            {{"word": "apple", "meaning": "A red or green fruit", "example": "I ate an apple."}},
            {{"word": "run", "meaning": "To move fast on foot", "example": "He runs every day."}}
        ]
    """

    try:
        response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt)
        text_response = response.text.replace('```json', '').replace('```', '').strip()
        data_list = json.loads(text_response)
        
        updated_count = 0
        for item in data_list:
            word_text = item.get('word')
            # Find the word object (case-insensitive check could be better, but sticking to simple match)
            # Since we pulled from DB, we can map back. optimizing this loop:
            match = next((w for w in words_to_process if w.word_text.lower() == word_text.lower()), None)
            if match:
                match.meaning = item.get('meaning')
                match.example = item.get('example')
                updated_count += 1
        
        db.session.commit()
        return jsonify({'message': 'Meanings generated', 'updated_count': updated_count}), 200

    except Exception as e:
        print(f"Gemini Batch Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- NEW: CUSTOM PROMPTS ROUTES ---
@api_bp.route('/chat/prompts', methods=['GET'])
def get_custom_prompts():
    prompts = CustomPrompt.query.order_by(CustomPrompt.timestamp.desc()).all()
    return jsonify([p.to_dict() for p in prompts])

@api_bp.route('/chat/prompts', methods=['POST'])
def create_custom_prompt():
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    
    if not title or not title.strip():
        return jsonify({'error': 'Title is required'}), 400
    if not content or not content.strip():
        return jsonify({'error': 'Content is required'}), 400
        
    new_prompt = CustomPrompt(title=title.strip(), content=content.strip())
    db.session.add(new_prompt)
    db.session.commit()
    return jsonify(new_prompt.to_dict()), 201

@api_bp.route('/chat/prompts/<int:prompt_id>', methods=['DELETE'])
def delete_custom_prompt(prompt_id):
    prompt = CustomPrompt.query.get_or_404(prompt_id)
    db.session.delete(prompt)
    db.session.commit()
    return '', 204