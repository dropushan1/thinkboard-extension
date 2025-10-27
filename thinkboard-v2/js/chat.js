// thinkboard-frontend/js/chat.js

import { formatTimestamp, pronounceWord } from './utils.js';

const NEW_THREAD_ID = 0;

export function initChatPage(API_BASE_URL) {
    // --- STATE ---
    let state = {
        folders: [],
        threads: [],
        activeThreadId: null,
        isSidebarVisible: true
    };
    let openMenuEl = null;

    // --- ELEMENT REFERENCES ---
    const newChatBtn = document.getElementById('new-chat-btn');
    const addChatFolderBtn = document.getElementById('add-chat-folder-btn');
    const chatSidebar = document.getElementById('chat-sidebar');
    const chatSidebarContent = document.getElementById('chat-sidebar-content');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');

    const chatTitleEl = document.getElementById('chat-title');
    const messagesContainerEl = document.getElementById('chat-messages-container');
    const chatInputEl = document.getElementById('chat-input');
    const sendBtnEl = document.getElementById('send-chat-btn');
    
    const filterToggleBtn = document.getElementById('chat-filter-toggle-btn');
    const filterPopover = document.getElementById('chat-filters-popover');
    const chatFiltersEl = document.getElementById('chat-filters');

    // --- RENDER FUNCTIONS ---
    const createThreadElement = (thread) => {
        const threadEl = document.createElement('div');
        threadEl.className = `p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 group flex justify-between items-center text-gray-800 dark:text-gray-100`;
        if (thread.id === state.activeThreadId) {
            threadEl.classList.add('bg-blue-100', 'dark:bg-blue-900/50');
        }
        threadEl.dataset.threadId = thread.id;
        threadEl.draggable = true;
        threadEl.innerHTML = `
            <p class="truncate text-sm flex-grow">${thread.title}</p>
            <div class="relative">
                <button title="More Options" class="more-options-btn text-gray-500 dark:text-gray-400 p-1 rounded-full opacity-0 group-hover:opacity-100">•••</button>
                <div class="options-menu hidden absolute right-0 top-6 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-20 w-32">
                    <button class="rename-thread-btn w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Rename</button>
                    <button class="delete-thread-btn w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">Delete Chat</button>
                </div>
            </div>
        `;

        threadEl.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', thread.id);
            setTimeout(() => threadEl.classList.add('opacity-50'), 0);
        });
        threadEl.addEventListener('dragend', () => threadEl.classList.remove('opacity-50'));

        return threadEl;
    };
    
    const createFolderElement = (folder) => {
        const folderEl = document.createElement('details');
        folderEl.className = 'folder-dropzone rounded-lg';
        folderEl.dataset.folderId = folder.id;
        folderEl.open = true;

        const summary = document.createElement('summary');
        summary.className = 'text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 list-none cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 flex justify-between items-center group';
        summary.innerHTML = `
            <div class="flex items-center">
                <span class="summary-arrow mr-2">▶</span>
                <span class="folder-name">${folder.name}</span>
            </div>
            <div class="relative">
                <button title="More Options" class="more-options-btn text-gray-500 dark:text-gray-400 p-1 rounded-full opacity-0 group-hover:opacity-100">•••</button>
                <div class="options-menu hidden absolute right-0 top-6 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-20 w-32">
                    <button class="rename-folder-btn w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Rename</button>
                    <button class="delete-folder-btn w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">Delete</button>
                </div>
            </div>
        `;

        const content = document.createElement('div');
        content.className = 'folder-content pl-2 space-y-2';
        folder.thread_ids.forEach(threadId => {
            const thread = state.threads.find(t => t.id === threadId);
            if (thread) content.appendChild(createThreadElement(thread));
        });
        if (content.children.length === 0) {
            content.innerHTML = `<p class="text-gray-500 text-center text-xs py-2">Drag chats here</p>`;
        }

        folderEl.appendChild(summary);
        folderEl.appendChild(content);

        folderEl.addEventListener('dragover', (e) => { e.preventDefault(); summary.classList.add('bg-blue-100', 'dark:bg-blue-900/50'); });
        folderEl.addEventListener('dragleave', () => { summary.classList.remove('bg-blue-100', 'dark:bg-blue-900/50'); });
        folderEl.addEventListener('drop', (e) => {
            e.preventDefault();
            summary.classList.remove('bg-blue-100', 'dark:bg-blue-900/50');
            const threadId = e.dataTransfer.getData('text/plain');
            handleMoveThread(parseInt(threadId, 10), folder.id);
        });

        return folderEl;
    };

    const renderSidebar = () => {
        chatSidebarContent.innerHTML = '';
        const uncategorizedThreads = state.threads.filter(t => t.folder_id === null);
        state.folders.forEach(folder => chatSidebarContent.appendChild(createFolderElement(folder)));
        const uncategorizedSection = document.createElement('div');
        uncategorizedSection.className = 'mt-4 folder-dropzone';
        uncategorizedSection.dataset.folderId = 'null';
        const header = document.createElement('h2');
        header.className = 'text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 p-1';
        header.textContent = 'Uncategorized';
        uncategorizedSection.appendChild(header);
        const uncategorizedList = document.createElement('div');
        uncategorizedList.className = 'space-y-2';
        if (uncategorizedThreads.length > 0) {
            uncategorizedThreads.forEach(thread => uncategorizedList.appendChild(createThreadElement(thread)));
        } else {
             uncategorizedList.innerHTML = `<p class="text-gray-500 text-center text-sm py-4">No uncategorized chats.</p>`;
        }
        uncategorizedSection.appendChild(uncategorizedList);
        uncategorizedSection.addEventListener('dragover', e => { e.preventDefault(); header.classList.add('bg-blue-100', 'dark:bg-blue-900/50'); });
        uncategorizedSection.addEventListener('dragleave', () => header.classList.remove('bg-blue-100', 'dark:bg-blue-900/50'));
        uncategorizedSection.addEventListener('drop', (e) => {
            e.preventDefault();
            header.classList.remove('bg-blue-100', 'dark:bg-blue-900/50');
            const threadId = e.dataTransfer.getData('text/plain');
            handleMoveThread(parseInt(threadId, 10), null);
        });
        chatSidebarContent.appendChild(uncategorizedSection);
    };

    const appendMessage = (msg) => {
        if (messagesContainerEl.querySelector('.flex.justify-center')) {
            messagesContainerEl.innerHTML = '';
        }
        const msgEl = document.createElement('div');
        const isUser = msg.role === 'user';
        msgEl.className = `flex flex-col mb-2 ${isUser ? 'items-end' : 'items-start'}`;

        const bubbleContainer = document.createElement('div');
        bubbleContainer.className = `flex items-start max-w-xl ${isUser ? 'flex-row-reverse' : 'space-x-2'}`;
        
        const contentEl = document.createElement('div');
        // --- UPDATED: Added a class for styling markdown content ---
        contentEl.className = `p-3 rounded-lg chat-bubble-content ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`;
        
        // --- UPDATED: Use innerHTML with marked for AI, innerText for user ---
        if (isUser) {
            contentEl.innerText = msg.content;
        } else {
            // This converts markdown to HTML
            contentEl.innerHTML = marked.parse(msg.content);
        }
        
        bubbleContainer.appendChild(contentEl);
        msgEl.appendChild(bubbleContainer);

        const footerEl = document.createElement('div');
        const alignmentClass = isUser ? 'justify-end' : 'justify-start';
        footerEl.className = `flex items-center ${alignmentClass} space-x-2 w-full max-w-xl mt-1 px-1`;

        if (!isUser) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'flex items-center space-x-2';
            actionsEl.innerHTML = `
                <button title="Copy Text" class="chat-copy-btn text-gray-500 dark:text-gray-400 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
                <button title="Read Aloud" class="chat-speak-btn text-xs p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">🔊</button>
            `;
            actionsEl.querySelector('.chat-copy-btn').dataset.content = msg.content;
            actionsEl.querySelector('.chat-speak-btn').dataset.content = msg.content;
            footerEl.appendChild(actionsEl);
        }

        const timeEl = document.createElement('p');
        timeEl.className = 'text-xs text-gray-400';
        timeEl.textContent = formatTimestamp(msg.timestamp);
        footerEl.appendChild(timeEl);
        
        msgEl.appendChild(footerEl);
        messagesContainerEl.appendChild(msgEl);
        messagesContainerEl.scrollTop = messagesContainerEl.scrollHeight;
    };

    const renderMessages = (messages = []) => {
        messagesContainerEl.innerHTML = '';
        if (messages.length === 0) {
            messagesContainerEl.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-gray-500 dark:text-gray-400">Type your first message below.</p></div>`;
            return;
        }
        messages.forEach(msg => appendMessage(msg));
    };
    
    const toggleSidebar = (isVisible) => {
        state.isSidebarVisible = isVisible;
        if (isVisible) {
            chatSidebar.classList.remove('w-0', 'p-0', 'overflow-hidden', 'hidden');
            chatSidebar.classList.add('w-1/3', 'md:w-1/4', 'flex');
        } else {
            chatSidebar.classList.add('w-0', 'p-0', 'overflow-hidden', 'hidden');
            chatSidebar.classList.remove('w-1/3', 'md:w-1/4', 'flex');
        }
    };

    const setActiveThread = async (threadId) => {
        state.activeThreadId = threadId;
        chatInputEl.disabled = false;
        sendBtnEl.disabled = false;
        if (threadId === NEW_THREAD_ID) {
            chatTitleEl.textContent = "New Chat (Unsaved)";
            renderMessages([]);
        } else {
            const thread = state.threads.find(t => t.id === threadId);
            chatTitleEl.textContent = thread ? thread.title : "Loading...";
            try {
                const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`);
                if (!res.ok) throw new Error('Failed to fetch messages');
                const messages = await res.json();
                renderMessages(messages);
            } catch (error) {
                console.error(error);
                messagesContainerEl.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
            }
        }
        renderSidebar();
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
        const payloadThreadId = state.activeThreadId === NEW_THREAD_ID ? null : state.activeThreadId;
        try {
            const response = await fetch(`${API_BASE_URL}/chat/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thread_id: payloadThreadId, user_message: messageText, filters: activeFilters })
            });
            if (!response.ok) throw new Error('API response was not ok.');
            const data = await response.json();
            if (state.activeThreadId === NEW_THREAD_ID) {
                await loadInitialData(data.thread.id);
            } else {
                const thread = state.threads.find(t => t.id === state.activeThreadId);
                if (thread) thread.timestamp = data.thread.timestamp;
                state.threads.sort((a, b) => b.timestamp - a.timestamp);
                renderSidebar();
                appendMessage(data.model_message);
            }
        } catch (error) {
            console.error(error);
            appendMessage({ content: `Error: ${error.message}`, role: 'model', timestamp: Math.floor(Date.now() / 1000) });
        } finally {
            sendBtnEl.disabled = false;
            chatInputEl.disabled = false;
            chatInputEl.focus();
        }
    };

    const handleMoveThread = async (threadId, newFolderId) => {
        const thread = state.threads.find(t => t.id === threadId);
        if (!thread || thread.folder_id === newFolderId) return;
        const oldFolderId = thread.folder_id;
        thread.folder_id = newFolderId;
        if (oldFolderId !== null) {
            const oldFolder = state.folders.find(f => f.id === oldFolderId);
            if (oldFolder) oldFolder.thread_ids = oldFolder.thread_ids.filter(id => id !== threadId);
        }
        if (newFolderId !== null) {
            const newFolder = state.folders.find(f => f.id === newFolderId);
            if (newFolder) newFolder.thread_ids.push(threadId);
        }
        renderSidebar();
        try {
            await fetch(`${API_BASE_URL}/chat/threads/${threadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: newFolderId })
            });
        } catch (error) {
            console.error("Failed to move thread:", error);
            await loadInitialData(state.activeThreadId);
        }
    };

    const loadInitialData = async (threadToSelect = null) => {
        try {
            const res = await fetch(`${API_BASE_URL}/chat/threads`);
            if (!res.ok) throw new Error('Failed to load chat data.');
            const data = await res.json();
            state.folders = data.folders;
            state.threads = data.threads.sort((a, b) => b.timestamp - a.timestamp);
            if (threadToSelect) {
                setActiveThread(threadToSelect);
            } else if (state.threads.length > 0) {
                setActiveThread(state.threads[0].id);
            } else {
                setActiveThread(NEW_THREAD_ID);
            }
        } catch (error) {
            console.error(error);
            chatSidebarContent.innerHTML = `<p class="text-red-500 text-center">${error.message}</p>`;
        }
    };

    // --- EVENT LISTENERS INITIALIZATION ---
    newChatBtn.addEventListener('click', () => setActiveThread(NEW_THREAD_ID));
    sendBtnEl.addEventListener('click', handleSendMessage);
    chatInputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    });
    toggleSidebarBtn.addEventListener('click', () => toggleSidebar(!state.isSidebarVisible));
    filterToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        filterPopover.classList.toggle('hidden');
    });
    addChatFolderBtn.addEventListener('click', async () => {
        const name = prompt('Enter new folder name:');
        if (name && name.trim()) {
            await fetch(`${API_BASE_URL}/chat/folders`, {
                method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: name.trim() })
            });
            await loadInitialData(state.activeThreadId);
        }
    });

    chatSidebarContent.addEventListener('click', async (e) => {
        const threadEl = e.target.closest('[data-thread-id]');
        const folderEl = e.target.closest('[data-folder-id]');

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

        if (e.target.closest('.rename-folder-btn')) {
            const folderId = parseInt(folderEl.dataset.folderId, 10);
            const folder = state.folders.find(f => f.id === folderId);
            const newName = prompt('Enter new folder name:', folder.name);
            if (newName && newName.trim() !== folder.name) {
                await fetch(`${API_BASE_URL}/chat/folders/${folderId}`, {
                    method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ name: newName.trim() })
                });
                await loadInitialData(state.activeThreadId);
            }
        } else if (e.target.closest('.delete-folder-btn')) {
            const folderId = parseInt(folderEl.dataset.folderId, 10);
            if (confirm('Delete this folder? Chats inside will become uncategorized.')) {
                await fetch(`${API_BASE_URL}/chat/folders/${folderId}`, { method: 'DELETE' });
                await loadInitialData(state.activeThreadId);
            }
        } else if (e.target.closest('.rename-thread-btn')) {
            const threadId = parseInt(threadEl.dataset.threadId, 10);
            const thread = state.threads.find(t => t.id === threadId);
            const newTitle = prompt('Enter new chat title:', thread.title);
            if (newTitle && newTitle.trim() && newTitle.trim() !== thread.title) {
                await fetch(`${API_BASE_URL}/chat/threads/${threadId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: newTitle.trim() })
                });
                await loadInitialData(state.activeThreadId);
            }
        } else if (e.target.closest('.delete-thread-btn')) {
            const threadId = parseInt(threadEl.dataset.threadId, 10);
            if (confirm('Are you sure you want to delete this chat thread?')) {
                await fetch(`${API_BASE_URL}/chat/threads/${threadId}`, { method: 'DELETE' });
                await loadInitialData(state.activeThreadId === threadId ? null : state.activeThreadId);
            }
        } else if (threadEl) {
            setActiveThread(parseInt(threadEl.dataset.threadId, 10));
        }
    });
    
    messagesContainerEl.addEventListener('click', async (e) => {
        const copyBtn = e.target.closest('.chat-copy-btn');
        if (copyBtn) {
            navigator.clipboard.writeText(copyBtn.dataset.content).catch(err => console.error('Failed to copy text: ', err));
        }
        const speakBtn = e.target.closest('.chat-speak-btn');
        if (speakBtn) {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            } else {
                await pronounceWord(speakBtn.dataset.content);
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.more-options-btn') && openMenuEl) {
            openMenuEl.classList.add('hidden');
            openMenuEl = null;
        }
        if (!e.target.closest('#chat-filter-toggle-btn') && !filterPopover.classList.contains('hidden')) {
             filterPopover.classList.add('hidden');
        }
    });

    loadInitialData();
}