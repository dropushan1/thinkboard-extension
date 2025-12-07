// js/words.js

import { pronounceWord } from './utils.js';

// --- ADDED: State variables for the options menu ---
let openMenuEl = null;
let isWordsDocumentListenerAdded = false;

export function initWordsPage(API_BASE_URL) {
    let activeWordCategory = 'Pronunciation';

    const wordsContent = document.getElementById('words-content');
    const tabsContainer = document.getElementById('words-tabs');
    const newWordInput = document.getElementById('new-word-input');
    const addWordBtn = document.getElementById('add-word-btn');
    const activeWordsList = document.getElementById('active-words-list');
    const mediumWordsList = document.getElementById('medium-words-list');
    const learnedWordsList = document.getElementById('learned-words-list');
    const generateSection = document.getElementById('generate-section'); // New
    const generateBtn = document.getElementById('generate-meanings-btn'); // New
    const generationStatus = document.getElementById('generation-status'); // New

    const createWordElement = (word) => {
        const el = document.createElement('div');
        el.className = 'word-item group bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg shadow-sm flex items-center cursor-grab';
        el.dataset.wordId = word.id;
        el.dataset.wordText = word.word_text;
        el.draggable = true;

        // --- UPDATED: HTML structure adjusted to place 3 dots immediately after the text ---
        // Added copy button and Meaning/Example section

        let meaningHtml = '';
        if (activeWordCategory === 'Meaning' && (word.meaning || word.example)) {
            meaningHtml = `
                <div class="word-meaning hidden w-full mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-sm">
                    ${word.meaning ? `<p class="text-gray-700 dark:text-gray-300"><strong>Meaning:</strong> ${word.meaning}</p>` : ''}
                    ${word.example ? `<p class="text-gray-600 dark:text-gray-400 italic mt-1">"${word.example}"</p>` : ''}
                </div>
            `;
            el.classList.add('flex-wrap'); // Allow wrapping for meaning
        }

        el.innerHTML = `
            <div class="flex items-center w-full">
                <button title="Pronounce Word" class="speak-word-btn text-md p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0">🔊</button>
                
                <p class="word-text text-gray-800 dark:text-gray-200 text-sm ml-2 mr-2 truncate cursor-pointer flex-grow select-none">${word.word_text}</p> 
                
                <button title="Copy Word" class="copy-word-btn text-gray-400 hover:text-blue-500 p-1 mr-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>

                <!-- Actions wrapper, opacity hides/shows the 3 dots -->
                <div class="word-actions relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button title="More Options" class="more-options-btn text-gray-500 dark:text-gray-400 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">•••</button>
                    <div class="options-menu hidden absolute right-0 top-6 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-20 w-28">
                        <button class="edit-word-btn w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600">Edit</button>
                        <button class="delete-word-btn w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600">Delete</button>
                    </div>
                </div>
            </div>
            ${meaningHtml}
        `;

        el.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', word.id);
            setTimeout(() => el.classList.add('opacity-50'), 0);
        });
        el.addEventListener('dragend', () => el.classList.remove('opacity-50'));
        return el;
    };

    const renderWords = async (category) => {
        tabsContainer.querySelectorAll('.words-tab-btn').forEach(btn => {
            btn.classList.toggle('bg-blue-100', btn.dataset.category === category);
            btn.classList.toggle('dark:bg-blue-900/50', btn.dataset.category === category);
        });
        const res = await fetch(`${API_BASE_URL}/words?category=${category}`);
        const words = await res.json();
        activeWordsList.innerHTML = '';
        mediumWordsList.innerHTML = '';
        learnedWordsList.innerHTML = '';
        words.filter(w => w.status === 'Active').forEach(word => activeWordsList.appendChild(createWordElement(word)));
        words.filter(w => w.status === 'Medium').forEach(word => mediumWordsList.appendChild(createWordElement(word)));
        words.filter(w => w.status === 'Learned').forEach(word => learnedWordsList.appendChild(createWordElement(word)));
        if (activeWordsList.children.length === 0) activeWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';
        if (mediumWordsList.children.length === 0) mediumWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';
        if (learnedWordsList.children.length === 0) learnedWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';

        // Show/Hide Generate Button
        if (category === 'Meaning') {
            generateSection.classList.remove('hidden');
        } else {
            generateSection.classList.add('hidden');
        }
    };

    const handleGenerateMeanings = async () => {
        generateBtn.disabled = true;
        generationStatus.classList.remove('hidden');

        try {
            const res = await fetch(`${API_BASE_URL}/words/generate-meanings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ process_all_new: true, category: 'Meaning' })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.updated_count === 0) {
                    alert("No new words to generate meanings for in this section.");
                } else {
                    await renderWords(activeWordCategory);
                    alert(`Generated meanings for ${data.updated_count} words.`);
                }
            } else {
                alert('Failed to generate meanings: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('Error connecting to server.');
        } finally {
            generateBtn.disabled = false;
            generationStatus.classList.add('hidden');
        }
    };

    const handleAddWord = async () => {
        const rawInput = newWordInput.value;
        if (!rawInput) return;

        // Split by comma, trim whitespace, remove empty strings
        const words = rawInput.split(',').map(w => w.trim()).filter(w => w);

        if (words.length === 0) return;

        // Add words sequentially (or could be parallel, but sequential is safer for order/rate limits)
        for (const wordText of words) {
            await fetch(`${API_BASE_URL}/words`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word_text: wordText, category: activeWordCategory })
            });
        }

        newWordInput.value = '';
        await renderWords(activeWordCategory);
    };

    tabsContainer.addEventListener('click', e => {
        if (e.target.matches('.words-tab-btn')) {
            activeWordCategory = e.target.dataset.category;
            renderWords(activeWordCategory);
        }
    });



    addWordBtn.addEventListener('click', handleAddWord);
    generateBtn.addEventListener('click', handleGenerateMeanings); // New Listener
    newWordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAddWord();
    });

    wordsContent.addEventListener('click', async e => {
        // --- ADDED: Logic to handle opening/closing the options menu ---
        if (e.target.closest('.more-options-btn')) {
            e.preventDefault();
            const menu = e.target.closest('.relative').querySelector('.options-menu');
            if (openMenuEl && openMenuEl !== menu) {
                openMenuEl.classList.add('hidden');
            }
            menu.classList.toggle('hidden');
            openMenuEl = menu.classList.contains('hidden') ? null : menu;
            return; // Stop further execution
        }

        const wordItem = e.target.closest('.word-item');
        if (!wordItem) return;
        const wordId = wordItem.dataset.wordId;

        // --- UPDATED: Changed .matches to .closest for reliability ---
        if (e.target.closest('.speak-word-btn')) {
            const wordToSpeak = wordItem.dataset.wordText;
            await pronounceWord(wordToSpeak);
        } else if (e.target.closest('.delete-word-btn')) {
            if (confirm('Are you sure you want to delete this word?')) {
                await fetch(`${API_BASE_URL}/words/${wordId}`, { method: 'DELETE' });
                await renderWords(activeWordCategory);
            }
        } else if (e.target.closest('.edit-word-btn')) {
            const newText = prompt('Edit word:', wordItem.dataset.wordText);
            if (newText && newText.trim() !== wordItem.dataset.wordText) {
                await fetch(`${API_BASE_URL}/words/${wordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word_text: newText.trim() })
                });
                await renderWords(activeWordCategory);
            }
        } else if (e.target.closest('.copy-word-btn')) {
            const text = wordItem.dataset.wordText;
            navigator.clipboard.writeText(text).then(() => {
                // Optional: show a small tooltip or feedback
                const btn = e.target.closest('.copy-word-btn');
                const originalColor = btn.classList.contains('text-gray-400') ? 'text-gray-400' : 'text-blue-500';
                btn.classList.remove('text-gray-400');
                btn.classList.add('text-green-500');
                setTimeout(() => {
                    btn.classList.remove('text-green-500');
                    btn.classList.add('text-gray-400');
                }, 1000);
            });
        } else if (e.target.closest('.word-text') || e.target === wordItem || e.target.closest('.word-item')) {
            // Toggle meaning visibility if clicking on the card body (but not buttons)
            // Ensure we aren't clicking a button
            if (!e.target.closest('button')) {
                const meaningDiv = wordItem.querySelector('.word-meaning');
                if (meaningDiv) {
                    meaningDiv.classList.toggle('hidden');
                }
            }
        }
    });

    wordsContent.addEventListener('dragover', e => {
        e.preventDefault();
        const dropzone = e.target.closest('.word-dropzone');
        if (dropzone) dropzone.classList.add('bg-blue-100', 'dark:bg-blue-900/50');
    });

    wordsContent.addEventListener('dragleave', e => {
        const dropzone = e.target.closest('.word-dropzone');
        if (dropzone) dropzone.classList.remove('bg-blue-100', 'dark:bg-blue-900/50');
    });

    wordsContent.addEventListener('drop', async e => {
        e.preventDefault();
        const dropzone = e.target.closest('.word-dropzone');
        if (dropzone) {
            dropzone.classList.remove('bg-blue-100', 'dark:bg-blue-900/50');
            const wordId = e.dataTransfer.getData('text/plain');
            const newStatus = dropzone.dataset.status;
            await fetch(`${API_BASE_URL}/words/${wordId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            await renderWords(activeWordCategory);
        }
    });

    // --- ADDED: Global listener to close the menu when clicking outside ---
    if (!isWordsDocumentListenerAdded) {
        document.addEventListener('click', (e) => {
            // Check if the click is outside the relative container of a word item menu
            if (!e.target.closest('.word-item .relative') && openMenuEl) {
                openMenuEl.classList.add('hidden');
                openMenuEl = null;
            }
        });
        isWordsDocumentListenerAdded = true;
    }

    renderWords(activeWordCategory);
}