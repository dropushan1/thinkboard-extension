// js/words.js

import { pronounceWord } from './utils.js';

export function initWordsPage(API_BASE_URL) {
    let activeWordCategory = 'Pronunciation';

    const wordsContent = document.getElementById('words-content');
    const tabsContainer = document.getElementById('words-tabs');
    const newWordInput = document.getElementById('new-word-input');
    const addWordBtn = document.getElementById('add-word-btn');
    const activeWordsList = document.getElementById('active-words-list');
    const mediumWordsList = document.getElementById('medium-words-list');
    const learnedWordsList = document.getElementById('learned-words-list');

    const createWordElement = (word) => {
        const el = document.createElement('div');
        el.className = 'word-item group bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg shadow-sm flex items-center cursor-grab';
        el.dataset.wordId = word.id;
        el.dataset.wordText = word.word_text;
        el.draggable = true;
        
        el.innerHTML = `
            <button title="Pronounce Word" class="speak-word-btn text-md p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">🔊</button>
            <p class="text-gray-800 dark:text-gray-200 text-sm ml-2">${word.word_text}</p>
            <div class="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                <button title="Edit Word" class="edit-word-btn text-xs p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">🖋️</button>
                <button title="Delete Word" class="delete-word-btn text-xs p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">🗑️</button>
            </div>`;
        
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
        if(activeWordsList.children.length === 0) activeWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';
        if(mediumWordsList.children.length === 0) mediumWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';
        if(learnedWordsList.children.length === 0) learnedWordsList.innerHTML = '<p class="text-gray-500 text-center text-xs py-4">Drag words here</p>';
    };

    const handleAddWord = async () => {
        const wordText = newWordInput.value.trim();
        if (!wordText) return;
        await fetch(`${API_BASE_URL}/words`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word_text: wordText, category: activeWordCategory })
        });
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
    newWordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleAddWord();
    });

    wordsContent.addEventListener('click', async e => {
        const wordItem = e.target.closest('.word-item');
        if (!wordItem) return;
        const wordId = wordItem.dataset.wordId;

        if (e.target.matches('.speak-word-btn')) {
            const wordToSpeak = wordItem.dataset.wordText;
            await pronounceWord(wordToSpeak);
        } else if (e.target.matches('.delete-word-btn')) {
            if (confirm('Are you sure you want to delete this word?')) {
                await fetch(`${API_BASE_URL}/words/${wordId}`, { method: 'DELETE' });
                await renderWords(activeWordCategory);
            }
        } else if (e.target.matches('.edit-word-btn')) {
            const newText = prompt('Edit word:', wordItem.dataset.wordText);
            if (newText && newText.trim() !== wordItem.dataset.wordText) {
                await fetch(`${API_BASE_URL}/words/${wordId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ word_text: newText.trim() })
                });
                await renderWords(activeWordCategory);
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

    renderWords(activeWordCategory);
}