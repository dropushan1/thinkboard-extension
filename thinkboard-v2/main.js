document.addEventListener('DOMContentLoaded', () => {
    const content = document.getElementById('content');

    // --- Page Routing ---

    // Function to load page content and initialize page-specific logic
    const loadPage = async (page) => {
        try {
            const response = await fetch(`pages/${page}.html`);
            if (!response.ok) {
                throw new Error('Page not found');
            }
            content.innerHTML = await response.text();
            
            // After loading the page, run its specific initializer
            if (page === 'home') {
                initHomePage();
            }
        } catch (error) {
            content.innerHTML = `<p class="text-center text-red-500">${error.message}</p>`;
        }
    };

    // Simple hash-based router
    const router = () => {
        const hash = window.location.hash.substring(1) || 'home';
        loadPage(hash);
    };

    // --- Initial Execution ---
    window.addEventListener('hashchange', router);
    router();

    // --- Home Page Logic ---

    // This function is called only when the home page is loaded
    const initHomePage = () => {
        // --- Element Selectors ---
        const quickNoteInput = document.getElementById('quick-note-input');
        const saveNoteBtn = document.getElementById('save-note-btn');
        const recentNotesContainer = document.getElementById('recent-notes-container');
        const notesByNicheContainer = document.getElementById('notes-by-niche-container');
        const viewAllNotesBtn = document.getElementById('view-all-notes-btn');
        const backToHomeBtn = document.getElementById('back-to-home-btn');
        const homeContainer = document.getElementById('home-container');
        const allNotesView = document.getElementById('all-notes-view');

        // --- Backend API Placeholder ---
        /**
         * Simulates a backend call to Gemini to classify the note's niche.
         * TODO: Replace this with a real API call to your backend.
         * @param {string} noteText The text of the note to classify.
         * @returns {Promise<string>} A promise that resolves to the predicted niche.
         */
        const classifyNoteWithGemini = async (noteText) => {
            console.log("Sending to mock backend for classification...");
            return new Promise(resolve => {
                setTimeout(() => {
                    // Example niches
                    const niches = ['Economics', 'AI', 'History', 'Physics', 'Programming'];
                    
                    // Simple keyword-based logic for simulation
                    if (noteText.toLowerCase().includes('agent')) resolve('AI');
                    else if (noteText.toLowerCase().includes('market')) resolve('Economics');
                    else if (noteText.toLowerCase().includes('react')) resolve('Programming');
                    else {
                        // Fallback to a random niche if no keyword is found
                        const randomNiche = niches[Math.floor(Math.random() * niches.length)];
                        resolve(randomNiche);
                    }
                }, 1000); // Simulate 1-second network delay
            });
        };

        // --- Chrome Storage Functions ---
        const getNotes = () => {
            return new Promise(resolve => {
                chrome.storage.local.get({ notes: [] }, (result) => {
                    // Sort notes by timestamp (newest first) before returning
                    result.notes.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(result.notes);
                });
            });
        };

        const saveNotes = (notes) => {
            return new Promise(resolve => {
                chrome.storage.local.set({ notes: notes }, () => {
                    resolve();
                });
            });
        };

        // --- Render Functions ---

        // Creates the HTML element for a single note
        const createNoteElement = (note) => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border dark:border-gray-700 flex justify-between items-center';
            noteDiv.dataset.noteId = note.id;

            const textSpan = document.createElement('span');
            textSpan.textContent = note.text;
            textSpan.className = 'flex-grow mr-4 break-all';

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'flex-shrink-0 flex space-x-2';

            const editBtn = document.createElement('button');
            editBtn.textContent = '🖊️';
            editBtn.className = 'edit-btn hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded';
            editBtn.title = 'Edit Note';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.className = 'delete-btn hover:bg-gray-200 dark:hover:bg-gray-600 p-1 rounded';
            deleteBtn.title = 'Delete Note';

            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            noteDiv.appendChild(textSpan);
            noteDiv.appendChild(actionsDiv);
            return noteDiv;
        };
        
        // Renders the 3 most recent notes on the main view
        const renderRecentNotes = (notes) => {
            recentNotesContainer.innerHTML = '';
            if (notes.length === 0) {
                recentNotesContainer.innerHTML = '<p class="text-gray-500">No notes yet. Write one above!</p>';
                return;
            }
            notes.slice(0, 3).forEach(note => {
                recentNotesContainer.appendChild(createNoteElement(note));
            });
        };

        // Renders all notes, grouped by niche, in the "All Notes" view
        const renderAllNotesByNiche = (notes) => {
            notesByNicheContainer.innerHTML = '';
             if (notes.length === 0) {
                notesByNicheContainer.innerHTML = '<p class="text-gray-500">No notes to display.</p>';
                return;
            }

            const notesByNiche = notes.reduce((acc, note) => {
                const niche = note.niche || 'Uncategorized';
                if (!acc[niche]) acc[niche] = [];
                acc[niche].push(note);
                return acc;
            }, {});

            for (const niche in notesByNiche) {
                const nicheContainer = document.createElement('div');
                const nicheHeader = document.createElement('h3');
                nicheHeader.className = 'text-xl font-bold mb-2 p-2 bg-gray-200 dark:bg-gray-700 rounded-md';
                nicheHeader.textContent = `📂 ${niche}`;
                
                const notesList = document.createElement('div');
                notesList.className = 'space-y-2 pl-4 border-l-2 ml-2';
                
                notesByNiche[niche].forEach(note => {
                    notesList.appendChild(createNoteElement(note));
                });
                
                nicheContainer.appendChild(nicheHeader);
                nicheContainer.appendChild(notesList);
                notesByNicheContainer.appendChild(nicheContainer);
            }
        };

        // Main function to update both note views
        const refreshAllViews = async () => {
            const notes = await getNotes();
            renderRecentNotes(notes);
            renderAllNotesByNiche(notes);
        };

        // --- Event Handlers ---
        const handleSaveNote = async () => {
            const noteText = quickNoteInput.value.trim();
            if (!noteText) return;

            saveNoteBtn.disabled = true;
            saveNoteBtn.textContent = 'Classifying...';

            try {
                const niche = await classifyNoteWithGemini(noteText);
                const notes = await getNotes();
                const newNote = {
                    id: Date.now(),
                    text: noteText,
                    timestamp: Date.now(),
                    niche: niche
                };
                notes.unshift(newNote); // Add to the beginning for chronological order
                await saveNotes(notes);
                await refreshAllViews();
                quickNoteInput.value = '';
            } catch (error) {
                console.error("Failed to save note:", error);
            } finally {
                saveNoteBtn.disabled = false;
                saveNoteBtn.textContent = 'Save Note';
            }
        };

        const handleNoteAction = async (e) => {
            const target = e.target;
            const noteItem = target.closest('.note-item');
            if (!noteItem) return;

            const noteId = Number(noteItem.dataset.noteId);
            let notes = await getNotes();

            if (target.classList.contains('delete-btn')) {
                if (confirm('Are you sure you want to delete this note?')) {
                    const updatedNotes = notes.filter(note => note.id !== noteId);
                    await saveNotes(updatedNotes);
                    await refreshAllViews();
                }
            }

            if (target.classList.contains('edit-btn')) {
                const noteToEdit = notes.find(note => note.id === noteId);
                const newText = prompt('Edit your note:', noteToEdit.text);
                if (newText !== null && newText.trim() !== '') {
                    noteToEdit.text = newText.trim();
                    await saveNotes(notes);
                    await refreshAllViews();
                }
            }
        };
        
        const toggleViews = () => {
            homeContainer.classList.toggle('hidden');
            allNotesView.classList.toggle('hidden');
        };

        // --- Event Listeners ---
        saveNoteBtn.addEventListener('click', handleSaveNote);
        viewAllNotesBtn.addEventListener('click', toggleViews);
        backToHomeBtn.addEventListener('click', toggleViews);
        
        // Use event delegation on the content container for dynamically created notes
        content.addEventListener('click', handleNoteAction);

        // --- Initial Render ---
        refreshAllViews();
    };
});