// main.js
import { initializeNotesFeature } from './js/notes.js';
import { initChatPage } from './js/chat.js';
import { initWordsPage } from './js/words.js';
// --- ADDED: Import the new settings page initializer ---
import { initSettingsPage } from './js/settings.js';

document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');
    const navLinks = document.querySelectorAll('.nav-link');
    const API_BASE_URL = 'http://127.0.0.1:5000/api';

    const router = async () => {
        const hash = window.location.hash.substring(1) || 'home';
        const pageName = hash.split('/')[0];

        let pageToLoad = 'home';
        if (['chat', 'words', 'grammar', 'settings'].includes(pageName)) {
            pageToLoad = pageName;
        }

        navLinks.forEach(link => {
            const linkPage = link.hash.substring(1);
            const isHomePageArea = ['home', 'all-notes', 'folder'].includes(pageName);
            const isActive = (linkPage === pageName) || (linkPage === 'home' && isHomePageArea);
            link.classList.toggle('bg-gray-200', isActive);
            link.classList.toggle('dark:bg-gray-700', isActive);
        });

        try {
            const response = await fetch(`pages/${pageToLoad}.html`);
            if (!response.ok) throw new Error(`Page ${pageToLoad}.html not found.`);
            content.innerHTML = await response.text();

            switch (pageToLoad) {
                case 'home':
                    initializeNotesFeature(API_BASE_URL);
                    break;
                case 'chat':
                    initChatPage(API_BASE_URL);
                    break;
                case 'words':
                    initWordsPage(API_BASE_URL);
                    break;
                // --- ADDED: Case for the new settings page ---
                case 'settings':
                    initSettingsPage();
                    break;
            }
        } catch (error) {
            console.error("Routing error:", error);
            content.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };

    window.addEventListener('hashchange', router);
    router(); // Initial call
});