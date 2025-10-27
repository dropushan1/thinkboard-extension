// js/notes.js

import { formatTimestamp } from './utils.js';

let API_BASE_URL;
// --- ADDED: State variables to manage the options menu ---
let openMenuEl = null;
let isNotesDocumentListenerAdded = false;

const createNoteElement = (note, isDraggable = false) => {
    const noteEl = document.createElement('div');
    noteEl.className = 'note-item group bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg shadow-sm flex justify-between items-start transition-shadow hover:shadow-md';
    noteEl.dataset.noteId = note.id;
    noteEl.dataset.noteText = note.text;
    noteEl.draggable = isDraggable;

    const contentDiv = document.createElement('div');
    contentDiv.className = "flex-grow mr-2";
    const textEl = document.createElement('p');
    textEl.textContent = note.text;
    textEl.className = 'note-text text-gray-800 dark:text-gray-200 break-words';
    const timeEl = document.createElement('p');
    timeEl.textContent = formatTimestamp(note.timestamp);
    timeEl.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1';
    contentDiv.appendChild(textEl);
    contentDiv.appendChild(timeEl);

    const actionsEl = document.createElement('div');
    // --- UPDATED: Switched to horizontal layout and added 3-dot menu ---
    actionsEl.className = 'flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity';
    actionsEl.innerHTML = `
        <button title="Copy Note" class="copy-btn text-gray-500 dark:text-gray-400 text-sm p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </button>
        <div class="relative">
            <button title="More Options" class="more-options-btn text-gray-500 dark:text-gray-400 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">•••</button>
            <div class="options-menu hidden absolute right-0 top-6 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-20 w-28">
                <button class="rename-note-btn w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Rename</button>
                <button class="delete-note-btn w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">Delete</button>
            </div>
        </div>
    `;

    noteEl.appendChild(contentDiv);
    noteEl.appendChild(actionsEl);

    if (isDraggable) {
        noteEl.classList.add('cursor-grab');
        noteEl.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', note.id);
            setTimeout(() => noteEl.classList.add('opacity-50'), 0);
        });
        noteEl.addEventListener('dragend', () => noteEl.classList.remove('opacity-50'));
    }
    return noteEl;
};

// --- UPDATED: Action handler now manages the menu state ---
const handleNoteAction = async (e) => {
    // --- FIXED: Guard clause prevents this listener from firing on other pages ---
    if (!e.target.closest('#home-view, #all-notes-view, #folder-view')) {
        return;
    }

    // Handle menu opening first
    if (e.target.closest('.more-options-btn')) {
        e.preventDefault();
        const menu = e.target.closest('.relative').querySelector('.options-menu');
        if (openMenuEl && openMenuEl !== menu) {
            openMenuEl.classList.add('hidden');
        }
        menu.classList.toggle('hidden');
        openMenuEl = menu.classList.contains('hidden') ? null : menu;
        return;
    }

    const noteItem = e.target.closest('.note-item');
    if (!noteItem) return;
    const noteId = noteItem.dataset.noteId;

    if (e.target.closest('.delete-note-btn')) {
        if (confirm('Are you sure you want to delete this note?')) {
            await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
            initializeNotesFeature(API_BASE_URL); // Re-render the page
        }
    } else if (e.target.closest('.rename-note-btn')) {
        const textEl = noteItem.querySelector('.note-text');
        const newText = prompt('Edit your note:', textEl.textContent);
        if (newText && newText.trim() !== textEl.textContent) {
            const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newText.trim() })
            });
            const updatedNote = await response.json();
            textEl.textContent = updatedNote.text;
            noteItem.querySelector('.text-xs').textContent = formatTimestamp(updatedNote.timestamp);
        }
    } else if (e.target.closest('.copy-btn')) {
        const textToCopy = noteItem.dataset.noteText;
        navigator.clipboard.writeText(textToCopy).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        });
    }
};

const initHomePage = () => {
    const noteInput = document.getElementById('note-input');
    const saveNoteBtn = document.getElementById('save-note-btn');
    const notesList = document.getElementById('notes-list-container');

    const fetchAndRenderRecent = async () => {
        const res = await fetch(`${API_BASE_URL}/notes`);
        const notes = await res.json();
        notesList.innerHTML = '';
        if (notes.length > 0) {
            notes.slice(0, 5).forEach(note => notesList.appendChild(createNoteElement(note)));
        } else {
            notesList.innerHTML = `<p class="text-gray-500 text-center py-4">No notes yet.</p>`;
        }
    };

    const handleSave = async () => {
        const text = noteInput.value.trim();
        if (!text) return;
        await fetch(`${API_BASE_URL}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text })
        });
        noteInput.value = '';
        await fetchAndRenderRecent();
    };

    saveNoteBtn.addEventListener('click', handleSave);
    noteInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); }
    });
    fetchAndRenderRecent();
};

const initAllNotesPage = async () => {
    const foldersList = document.getElementById('folders-list');
    const uncategorizedList = document.getElementById('uncategorized-notes-list');

    const createFolderElement = (folder) => {
        const el = document.createElement('div');
        el.className = 'folder-dropzone p-3 border-2 border-dashed border-transparent rounded-lg dark:bg-gray-700/50 group';
        el.dataset.folderId = folder.id;
        el.innerHTML = `
            <div class="flex justify-between items-center">
                <a href="#folder/${folder.id}" class="font-bold text-gray-800 dark:text-gray-100 flex-grow hover:underline">${folder.name}</a>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                   <button title="Rename" class="rename-folder-btn text-sm p-1">✏️</button>
                   <button title="Delete" class="delete-folder-btn text-sm p-1">🗑️</button>
                </div>
            </div>`;
        el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('border-blue-500'); });
        el.addEventListener('dragleave', () => el.classList.remove('border-blue-500'));
        el.addEventListener('drop', async (e) => {
            e.preventDefault();
            el.classList.remove('border-blue-500');
            const noteId = e.dataTransfer.getData('text/plain');
            await fetch(`${API_BASE_URL}/notes/${noteId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folder.id })
            });
            document.querySelector(`.note-item[data-note-id='${noteId}']`).remove();
        });
        return el;
    };

    const fetchAndRenderAll = async () => {
        const [notesRes, foldersRes] = await Promise.all([fetch(`${API_BASE_URL}/notes`), fetch(`${API_BASE_URL}/folders`)]);
        const allNotes = await notesRes.json();
        const allFolders = await foldersRes.json();

        foldersList.innerHTML = '';
        allFolders.forEach(f => foldersList.appendChild(createFolderElement(f)));

        uncategorizedList.innerHTML = '';
        const uncategorizedNotes = allNotes.filter(n => n.folder_id === null);
        if (uncategorizedNotes.length > 0) {
            uncategorizedNotes.forEach(note => uncategorizedList.appendChild(createNoteElement(note, true)));
        } else {
             uncategorizedList.innerHTML = `<p class="text-gray-500 text-center text-sm py-4">No uncategorized notes.</p>`;
        }
    };

    document.getElementById('add-folder-btn').onclick = async () => {
        const name = prompt('New folder name:');
        if(name && name.trim()) {
             await fetch(`${API_BASE_URL}/folders`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name }) });
             await fetchAndRenderAll();
        }
    };

    foldersList.onclick = async (e) => {
        const folderEl = e.target.closest('.folder-dropzone');
        if(!folderEl) return;
        const folderId = folderEl.dataset.folderId;
        if(e.target.matches('.rename-folder-btn')) {
            const newName = prompt('Enter new folder name:');
            if(newName && newName.trim()) {
                await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: newName }) });
                await fetchAndRenderAll();
            }
        } else if (e.target.matches('.delete-folder-btn')) {
            if(confirm('Delete this folder? Notes inside will also be deleted.')) {
                await fetch(`${API_BASE_URL}/folders/${folderId}`, { method: 'DELETE' });
                await fetchAndRenderAll();
            }
        }
    };

    await fetchAndRenderAll();
};

const initFolderViewPage = async (folderId) => {
    const header = document.getElementById('folder-name-header');
    const notesList = document.getElementById('notes-in-folder-list');

    const [notesRes, folderRes] = await Promise.all([fetch(`${API_BASE_URL}/notes`), fetch(`${API_BASE_URL}/folders/${folderId}`)]);
    const allNotes = await notesRes.json();
    const folder = await folderRes.json();

    header.textContent = `Folder: ${folder.name}`;
    notesList.innerHTML = '';
    const notesInFolder = allNotes.filter(n => n.folder_id == folderId);
    if (notesInFolder.length > 0) {
        notesInFolder.forEach(note => notesList.appendChild(createNoteElement(note)));
    } else {
        notesList.innerHTML = `<p class="text-gray-500 text-center py-4">This folder is empty.</p>`;
    }
};

export function initializeNotesFeature(apiUrl) {
    API_BASE_URL = apiUrl;
    const content = document.getElementById('content');
    // Remove old listener to prevent duplicates from multiple initializations
    content.removeEventListener('click', handleNoteAction);
    content.addEventListener('click', handleNoteAction);

    // --- ADDED: Listener to close menu when clicking outside ---
    // This check ensures the listener is only added once for the whole app session.
    if (!isNotesDocumentListenerAdded) {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.note-item .relative') && openMenuEl) {
                openMenuEl.classList.add('hidden');
                openMenuEl = null;
            }
        });
        isNotesDocumentListenerAdded = true;
    }

    const hash = window.location.hash.substring(1) || 'home';
    const [page, param] = hash.split('/');

    const homeView = document.getElementById('home-view');
    const allNotesView = document.getElementById('all-notes-view');
    const folderView = document.getElementById('folder-view');

    homeView.classList.add('hidden');
    allNotesView.classList.add('hidden');
    folderView.classList.add('hidden');

    if (page === 'all-notes') {
        allNotesView.classList.remove('hidden');
        initAllNotesPage();
    } else if (page === 'folder' && param) {
        folderView.classList.remove('hidden');
        initFolderViewPage(param);
    } else {
        homeView.classList.remove('hidden');
        initHomePage();
    }
};