document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    // --- UNIVERSAL HELPER FUNCTIONS [No Changes] ---
    const formatTimestamp = (unixTimestamp) => new Date(unixTimestamp * 1000).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });

    const createNoteElement = (note, isDraggable = false) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item group bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg shadow-sm flex justify-between items-start transition-shadow hover:shadow-md';
        noteEl.dataset.noteId = note.id;
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
        actionsEl.className = 'flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity';
        actionsEl.innerHTML = `
            <button title="Edit Note" class="edit-btn text-sm p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">🖊️</button>
            <button title="Delete Note" class="delete-btn text-sm p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">🗑️</button>
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

    const handleNoteAction = async (e) => {
        const noteItem = e.target.closest('.note-item');
        if (!noteItem) return;
        const noteId = noteItem.dataset.noteId;

        if (e.target.matches('.delete-btn')) {
            if (confirm('Are you sure you want to delete this note?')) {
                await fetch(`${API_BASE_URL}/notes/${noteId}`, { method: 'DELETE' });
                // Refresh the current view to reflect the change
                handleViewChange(); 
            }
        } else if (e.target.matches('.edit-btn')) {
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
        }
    };
    content.addEventListener('click', handleNoteAction);


    // --- NEW ROUTING & VIEW HANDLING LOGIC ---
    let isInitialized = false;

    const handleViewChange = () => {
        const hash = window.location.hash.substring(1) || 'home';
        const [page, param] = hash.split('/');

        // Get all view containers
        const homeView = document.getElementById('home-view');
        const allNotesView = document.getElementById('all-notes-view');
        const folderView = document.getElementById('folder-view');
        
        // Hide all views first
        homeView.classList.add('hidden');
        allNotesView.classList.add('hidden');
        folderView.classList.add('hidden');

        // Show the correct view and populate it with data
        if (page === 'all-notes') {
            allNotesView.classList.remove('hidden');
            initAllNotesPage();
        } else if (page === 'folder' && param) {
            folderView.classList.remove('hidden');
            initFolderViewPage(param);
        } else { // Default to home
            homeView.classList.remove('hidden');
            // Only re-initialize the home page if it's the very first load
            if (!isInitialized) {
                initHomePage();
                isInitialized = true;
            }
        }
    };

    const router = async () => {
        // The router's only job is to load the main HTML file ONCE
        // and then let the hashchange listener handle view swaps.
        const pageToLoad = 'home'; // Always load home.html
        
        try {
            const response = await fetch(`pages/${pageToLoad}.html`);
            if (!response.ok) throw new Error('Main page not found');
            content.innerHTML = await response.text();

            // Set up listeners and trigger the first view change
            window.addEventListener('hashchange', handleViewChange);
            handleViewChange(); // Initial view rendering
        } catch (error) {
            content.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };

    router(); // Initial load of the extension

    // --- PAGE INITIALIZERS (Slightly modified to be re-runnable) ---
    const initHomePage = () => {
        const noteInput = document.getElementById('note-input');
        const saveNoteBtn = document.getElementById('save-note-btn');
        const notesList = document.getElementById('notes-list-container');

        const fetchAndRenderRecent = async () => {
            const res = await fetch(`${API_BASE_URL}/notes`);
            const notes = await res.json();
            notesList.innerHTML = ''; // Clear previous content
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
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); 
                handleSave();
            }
        });

        fetchAndRenderRecent(); // Initial render for the home page
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
                </div>
            `;
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
        
        document.getElementById('add-folder-btn').onclick = async () => { // Use onclick to avoid duplicate listeners
            const name = prompt('New folder name:');
            if(name && name.trim()) {
                 await fetch(`${API_BASE_URL}/folders`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name }) });
                 await fetchAndRenderAll();
            }
        };

        foldersList.onclick = async (e) => { // Use onclick for event delegation
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
                if(confirm('Delete this folder? Notes inside will become uncategorized.')) {
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

        const [notesRes, folderRes] = await Promise.all([
            fetch(`${API_BASE_URL}/notes`),
            fetch(`${API_BASE_URL}/folders/${folderId}`)
        ]);
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
});