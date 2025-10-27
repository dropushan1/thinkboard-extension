// js/chat.js
import { formatTimestamp } from './utils.js';

const NEW_THREAD_ID = 0;

export function initChatPage(API_BASE_URL) {
    let activeThreadId = null;
    let threads = [];

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

    const renderMessages = (messages = []) => {
        messagesContainerEl.innerHTML = '';
        if (messages.length === 0) {
            messagesContainerEl.innerHTML = `<div class="flex justify-center items-center h-full"><p class="text-gray-500 dark:text-gray-400">Type your first message below.</p></div>`;
            return;
        }
        messages.forEach(msg => appendMessage(msg));
    };

    const setActiveThread = async (threadId) => {
        activeThreadId = threadId;
        chatInputEl.disabled = false;
        sendBtnEl.disabled = false;
        if (threadId === NEW_THREAD_ID) {
            chatTitleEl.textContent = "New Chat (Unsaved)";
            renderMessages([]);
        } else {
            const thread = threads.find(t => t.id === threadId);
            chatTitleEl.textContent = thread ? thread.title : "Loading...";
            const res = await fetch(`${API_BASE_URL}/chat/threads/${threadId}/messages`);
            const messages = await res.json();
            renderMessages(messages);
        }
        renderThreads();
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
        const payloadThreadId = activeThreadId === NEW_THREAD_ID ? null : activeThreadId;
        const response = await fetch(`${API_BASE_URL}/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thread_id: payloadThreadId, user_message: messageText, filters: activeFilters })
        });
        const data = await response.json();
        if (activeThreadId === NEW_THREAD_ID) {
            activeThreadId = data.thread.id;
            threads.unshift(data.thread);
            chatTitleEl.textContent = data.thread.title;
            renderThreads();
        } else {
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

    const loadInitialData = async () => {
        const res = await fetch(`${API_BASE_URL}/chat/threads`);
        threads = await res.json();
        setActiveThread(threads.length > 0 ? threads[0].id : NEW_THREAD_ID);
    };

    newChatBtn.addEventListener('click', () => setActiveThread(NEW_THREAD_ID));
    sendBtnEl.addEventListener('click', handleSendMessage);
    chatInputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
    });
    threadsListEl.addEventListener('click', (e) => {
        const threadEl = e.target.closest('[data-thread-id]');
        if (!threadEl) return;
        const threadId = parseInt(threadEl.dataset.threadId, 10);
        if (e.target.matches('.delete-thread-btn')) {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this chat thread?')) {
                fetch(`${API_BASE_URL}/chat/threads/${threadId}`, { method: 'DELETE' }).then(() => {
                    threads = threads.filter(t => t.id !== threadId);
                    if (activeThreadId === threadId) {
                        setActiveThread(threads.length > 0 ? threads[0].id : NEW_THREAD_ID);
                    }
                    renderThreads();
                });
            }
        } else {
            setActiveThread(threadId);
        }
    });

    loadInitialData();
}