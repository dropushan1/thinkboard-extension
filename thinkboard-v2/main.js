// main.js
import { initializeNotesFeature } from './js/notes.js';
import { initChatPage } from './js/chat.js';
import { initWordsPage } from './js/words.js';
import { initSettingsPage } from './js/settings.js';
// --- ADDED: Import the new grammar page initializer ---
import { initGrammarPage } from './js/grammar.js';

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('.nav-link');
    const API_BASE_URL = 'https://track.vidoro.xyz/api';

    // --- PERSISTENCE: Create a container for the Chat page that is never destroyed ---
    // We append it to #content once, and toggle its visibility.
    // For other pages, we used a shared 'dynamic' container.

    // 1. Initialize Containers
    content.innerHTML = ''; // Clear default

    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-view';
    chatContainer.className = 'h-full hidden'; // Hidden by default, take full height
    content.appendChild(chatContainer);

    const dynamicContainer = document.createElement('div');
    dynamicContainer.id = 'dynamic-view';
    dynamicContainer.className = 'h-full';
    content.appendChild(dynamicContainer);

    let isChatInitialized = false;

    const router = async () => {
        const hash = window.location.hash.substring(1) || 'home';
        const pageName = hash.split('/')[0];

        let pageToLoad = 'home';
        if (['chat', 'words', 'grammar', 'settings'].includes(pageName)) {
            pageToLoad = pageName;
        }

        // Update Nav
        navLinks.forEach(link => {
            const linkPage = link.hash.substring(1);
            const isHomePageArea = ['home', 'all-notes', 'folder'].includes(pageName);
            const isActive = (linkPage === pageName) || (linkPage === 'home' && isHomePageArea);
            link.classList.toggle('bg-gray-200', isActive);
            link.classList.toggle('dark:bg-gray-700', isActive);
        });

        try {
            if (pageToLoad === 'chat') {
                // Show Chat, Hide Dynamic
                dynamicContainer.classList.add('hidden');
                chatContainer.classList.remove('hidden');

                if (!isChatInitialized) {
                    const response = await fetch(`pages/chat.html`);
                    if (!response.ok) throw new Error(`Page chat.html not found.`);
                    chatContainer.innerHTML = await response.text();
                    initChatPage(API_BASE_URL);
                    isChatInitialized = true;
                }
                // Chat state is preserved because we never touch chatContainer.innerHTML again
            } else {
                // Show Dynamic, Hide Chat
                chatContainer.classList.add('hidden');
                dynamicContainer.classList.remove('hidden');
                dynamicContainer.innerHTML = 'Loading...';

                const response = await fetch(`pages/${pageToLoad}.html`);
                if (!response.ok) throw new Error(`Page ${pageToLoad}.html not found.`);
                dynamicContainer.innerHTML = await response.text();

                switch (pageToLoad) {
                    case 'home':
                        initializeNotesFeature(API_BASE_URL);
                        break;
                    case 'words':
                        initWordsPage(API_BASE_URL);
                        break;
                    case 'settings':
                        initSettingsPage();
                        break;
                    case 'grammar':
                        initGrammarPage(API_BASE_URL);
                        break;
                }
            }
        } catch (error) {
            console.error("Routing error:", error);
            // Show error in the active container
            if (pageToLoad === 'chat') {
                chatContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
            } else {
                dynamicContainer.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
            }
        }
    };

    window.addEventListener('hashchange', router);
    router(); // Initial call
});