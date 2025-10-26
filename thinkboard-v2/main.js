document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('.nav-link');
    const API_BASE_URL = 'http://127.0.0.1:5000/api';
    
    // State constant for an unsaved chat session
    const NEW_THREAD_ID = 0; 

    // --- UNIVERSAL HELPER FUNCTIONS ---
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
                // Re-trigger view change to refresh the list
                const currentHash = window.location.hash.substring(1) || 'home';
                if (currentHash.startsWith('home') || currentHash.startsWith('all-notes') || currentHash.startsWith('folder')) {
                    handleHomeViewChange();
                }
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
    
    // Universal listener for note actions
    content.addEventListener('click', (e) => {
        if (e.target.closest('.note-item')) {
            handleNoteAction(e);
        }
    });

    // --- ROUTING & VIEW HANDLING LOGIC ---
    let isInitialized = false; // Only used for initial setup of the homepage input box

    const router = async () => {
        const hash = window.location.hash.substring(1) || 'home';
        const pageName = hash.split('/')[0]; 
        const validPages = ['home', 'chat', 'words', 'grammar', 'settings'];

        const pageToLoad = validPages.includes(pageName) ? pageName : 'home';

        // Highlight active nav link
        navLinks.forEach(link => {
            link.classList.toggle('bg-gray-200', link.hash === `#${pageToLoad}`);
            link.classList.toggle('dark:bg-gray-700', link.hash === `#${pageToLoad}`);
        });
        
        try {
            const response = await fetch(`pages/${pageToLoad}.html`);
            if (!response.ok) throw new Error(`Page ${pageToLoad}.html not found.`);
            content.innerHTML = await response.text();

            // Call the specific initializer for the loaded page
            if (pageToLoad === 'home') {
                // Initialize the internal hash routing for the notes feature
                window.removeEventListener('hashchange', router); // Temporarily remove main router
                handleHomeViewChange(); 
                window.addEventListener('hashchange', handleHomeViewChange);
                window.addEventListener('hashchange', router); // Re-add main router (needed if hash changes to a different top-level page)
            } else if (pageToLoad === 'chat') {
                initChatPage();
            }
            // For other pages, content is static HTML.

        } catch (error) {
            console.error("Routing error:", error);
            content.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };
    
    // Initial load and listen for hash changes
    router();
    window.addEventListener('hashchange', router);


    // --- NOTES/HOME PAGE LOGIC ---
    
    const handleHomeViewChange = () => {
        const hash = window.location.hash.substring(1) || 'home';
        const [page, param] = hash.split('/');

        const homeView = document.getElementById('home-view');
        if (!homeView) return; 

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
        
        // Ensure listeners are only added once
        if (!isInitialized) {
            saveNoteBtn.addEventListener('click', handleSave);
            noteInput.addEventListener('keydown', e => { 
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); 
                    handleSave();
                }
            });
            isInitialized = true;
        }

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


    // --- CHAT PAGE LOGIC ---
    const initChatPage = () => {
        // State variables
        let activeThreadId = null;
        let threads = [];

        // DOM Element references
        const newChatBtn = document.getElementById('new-chat-btn');
        const threadsListEl = document.getElementById('chat-threads-list');
        const chatTitleEl = document.getElementById('chat-title');
        const messagesContainerEl = document.getElementById('chat-messages-container');
        const chatInputEl = document.getElementById('chat-input');
        const sendBtnEl = document.getElementById('send-chat-btn');
        const chatFiltersEl = document.getElementById('chat-filters');

        const renderThreads = () => {
            threadsListEl.innerHTML = '';
            if (threads.length === 0) {
                threadsListEl.innerHTML = `<p class="text-gray-500 text-center text-sm py-4">No saved chats.</p>`;
                return;
            }
            threads.forEach(thread => {
                const threadEl = document.createElement('div');
                // Ensure text color is visible (white in dark mode)
                threadEl.className = `p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 group flex justify-between items-center text-gray-800 dark:text-gray-100`; 
                
                if (thread.id === activeThreadId) {
                    threadEl.classList.add('bg-blue-100', 'dark:bg-blue-900/50');
                }
                threadEl.dataset.threadId = thread.id;
                threadEl.innerHTML = `
                    <p class="truncate text-sm flex-grow">${thread.title}</p>
                    <button title="Delete Thread" class="delete-thread-btn text-xs p-1 opacity-0 group-hover:opacity-100">🗑️</button>
                `;
                threadsListEl.appendChild(threadEl);
            });
        };

        const renderMessages = (messages = []) => {
            messagesContainerEl.innerHTML = '';
            if (messages.length === 0) {
                messagesContainerEl.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-gray-500 dark:text-gray-400">Type your first message below.</p></div>`;
                return;
            }
            messages.forEach(msg => appendMessage(msg));
        };
        
        const appendMessage = (msg) => {
            if (messagesContainerEl.querySelector('.flex.justify-center')) {
                messagesContainerEl.innerHTML = '';
            }
            const msgEl = document.createElement('div');
            const isUser = msg.role === 'user';
            msgEl.className = `flex flex-col ${isUser ? 'items-end' : 'items-start'}`;
            
            const contentEl = document.createElement('div');
            contentEl.className = `max-w-lg p-3 rounded-lg ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`;
            contentEl.innerText = msg.content; 
            
            const timeEl = document.createElement('p');
            timeEl.className = 'text-xs text-gray-400 mt-1 px-1';
            timeEl.textContent = formatTimestamp(msg.timestamp);

            msgEl.appendChild(contentEl);
            msgEl.appendChild(timeEl);
            messagesContainerEl.appendChild(msgEl);
            messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight; 
        };


        const setActiveThread = async (threadId) => {
            activeThreadId = threadId;

            if (threadId === NEW_THREAD_ID) {
                chatTitleEl.textContent = "New Chat (Unsaved)";
                renderMessages([]);
                chatInputEl.disabled = false;
                sendBtnEl.disabled = false;
            } else {
                const thread = threads.find(t => t.id === threadId);
                chatTitleEl.textContent = thread ? thread.title : "Loading...";
                const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`);
                const messages = await res.json();
                renderMessages(messages);
                chatInputEl.disabled = false;
                sendBtnEl.disabled = false;
            }
            renderThreads();
        };

        const loadInitialData = async () => {
            const res = await fetch(`${API_BASE_URL}/chat/threads`);
            threads = await res.json();
            
            // Conditional Auto-Select: If no threads exist, start a new chat (ID 0). Otherwise, load the newest.
            if (threads.length === 0) {
                setActiveThread(NEW_THREAD_ID); 
            } else {
                setActiveThread(threads[0].id); 
            }
        };

        const handleSendMessage = async () => {
            const messageText = chatInputEl.value.trim();
            if (!messageText) return;

            sendBtnEl.disabled = true;
            chatInputEl.disabled = true;

            const userMessage = { content: messageText, role: 'user', timestamp: Math.floor(Date.now() / 1000) };
            appendMessage(userMessage);
            chatInputEl.value = '';

            const activeFilters = Array.from(chatFiltersEl.querySelectorAll('input:checked')).map(input => input.value);
            
            // Send null thread_id if this is a NEW_THREAD_ID (unsaved chat)
            const payloadThreadId = activeThreadId === NEW_THREAD_ID ? null : activeThreadId;

            const response = await fetch(`${API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thread_id: payloadThreadId,
                    user_message: messageText,
                    filters: activeFilters
                })
            });

            const data = await response.json();
            
            if (activeThreadId === NEW_THREAD_ID) { 
                // New thread was created in the backend
                activeThreadId = data.thread.id;
                threads.unshift(data.thread); 
                chatTitleEl.textContent = data.thread.title;
                renderThreads(); 
            } else {
                // Update timestamp for existing thread to float it to the top
                const threadIndex = threads.findIndex(t => t.id === activeThreadId);
                if (threadIndex > -1) {
                    const updatedThread = threads.splice(threadIndex, 1)[0];
                    updatedThread.timestamp = data.thread.timestamp; 
                    threads.unshift(updatedThread); 
                    renderThreads();
                }
            }
            
            appendMessage(data.model_message);

            sendBtnEl.disabled = false;
            chatInputEl.disabled = false;
            chatInputEl.focus();
        };

        // Event Listeners
        newChatBtn.addEventListener('click', () => setActiveThread(NEW_THREAD_ID));

        threadsListEl.addEventListener('click', (e) => {
            const threadEl = e.target.closest('[data-thread-id]');
            if (!threadEl) return;
            
            const threadId = parseInt(threadEl.dataset.threadId, 10);
            
            if (e.target.matches('.delete-thread-btn')) {
                e.stopPropagation(); 
                if (confirm('Are you sure you want to delete this chat thread?')) {
                    fetch(`${API_BASE_URL}/chat/threads/${threadId}`, { method: 'DELETE' })
                        .then(() => {
                            threads = threads.filter(t => t.id !== threadId);
                            if (activeThreadId === threadId) {
                                setActiveThread(NEW_THREAD_ID); 
                            }
                            renderThreads();
                        });
                }
            } else {
                setActiveThread(threadId);
            }
        });

        sendBtnEl.addEventListener('click', handleSendMessage);
        chatInputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        loadInitialData();
    };
});