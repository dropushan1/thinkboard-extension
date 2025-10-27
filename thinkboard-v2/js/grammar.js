// js/grammar.js

export function initGrammarPage(API_BASE_URL) {
    // --- ELEMENT REFERENCES ---
    const grammarInputEl = document.getElementById('grammar-input');
    const showAdviceToggleEl = document.getElementById('show-advice-toggle');
    const correctBtnEl = document.getElementById('correct-grammar-btn');

    const resultsAreaEl = document.getElementById('grammar-results-area');
    const originalTextOutputEl = document.getElementById('original-text-output');
    const correctedTextOutputEl = document.getElementById('corrected-text-output');
    const copyBtnEl = document.getElementById('copy-corrected-btn');

    const adviceMistakesAreaEl = document.getElementById('advice-mistakes-area');
    const correctionAdviceEl = document.getElementById('correction-advice');
    const mistakesListEl = document.getElementById('mistakes-list');
    const saveMistakesBtnEl = document.getElementById('save-mistakes-btn');

    // --- LOGIC ---
    const handleCorrectGrammar = async () => {
        const textToCorrect = grammarInputEl.value.trim();
        if (!textToCorrect) {
            alert('Please enter some text to correct.');
            return;
        }

        correctBtnEl.disabled = true;
        correctBtnEl.textContent = 'Correcting...';
        resultsAreaEl.classList.add('hidden');
        adviceMistakesAreaEl.classList.add('hidden');
        mistakesListEl.innerHTML = ''; // Clear previous mistakes

        try {
            const response = await fetch(`${API_BASE_URL}/grammar/correct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: textToCorrect,
                    include_advice: showAdviceToggleEl.checked
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'An unknown error occurred.');
            }

            const data = await response.json();

            // Populate results
            originalTextOutputEl.textContent = textToCorrect;
            correctedTextOutputEl.textContent = data.corrected_text;
            resultsAreaEl.classList.remove('hidden');

            // Handle advice and mistakes if they exist
            if (data.advice && data.mistakes && data.mistakes.length > 0) {
                correctionAdviceEl.textContent = data.advice;
                
                data.mistakes.forEach(mistake => {
                    const label = document.createElement('label');
                    label.className = 'flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer';
                    label.innerHTML = `
                        <input type="checkbox" value="${mistake.corrected}" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-original="${mistake.original}">
                        <div>
                            <span class="text-red-500 line-through text-sm">${mistake.original}</span>
                            <span class="text-green-500 text-sm font-semibold mx-2">→</span>
                            <span class="text-gray-800 dark:text-gray-100 text-sm">${mistake.corrected}</span>
                        </div>
                    `;
                    mistakesListEl.appendChild(label);
                });

                saveMistakesBtnEl.classList.remove('hidden');
                adviceMistakesAreaEl.classList.remove('hidden');
            } else {
                 saveMistakesBtnEl.classList.add('hidden');
            }

        } catch (error) {
            console.error('Grammar correction failed:', error);
            alert(`Error: ${error.message}`);
        } finally {
            correctBtnEl.disabled = false;
            correctBtnEl.textContent = 'Correct';
        }
    };

    const handleCopyText = () => {
        const text = correctedTextOutputEl.textContent;
        navigator.clipboard.writeText(text)
            .then(() => {
                copyBtnEl.textContent = '✅ Copied!';
                setTimeout(() => { copyBtnEl.textContent = '📋 Copy Corrected Text'; }, 2000);
            })
            .catch(err => console.error('Failed to copy text: ', err));
    };

    const handleSaveWords = async () => {
        const selectedCheckboxes = mistakesListEl.querySelectorAll('input[type="checkbox"]:checked');
        if (selectedCheckboxes.length === 0) {
            alert('Please select at least one word to save.');
            return;
        }

        saveMistakesBtnEl.disabled = true;
        saveMistakesBtnEl.textContent = 'Saving...';

        let savedCount = 0;
        for (const checkbox of selectedCheckboxes) {
            const wordToSave = checkbox.value;
            try {
                await fetch(`${API_BASE_URL}/words`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        word_text: wordToSave,
                        category: 'Spelling'
                    })
                });
                savedCount++;
            } catch (error) {
                console.error(`Failed to save word: ${wordToSave}`, error);
            }
        }

        saveMistakesBtnEl.disabled = false;
        saveMistakesBtnEl.textContent = 'Save Selected to Words → Spelling';
        alert(`${savedCount} of ${selectedCheckboxes.length} words saved successfully to the 'Spelling' category.`);
    };

    // --- EVENT LISTENERS ---
    correctBtnEl.addEventListener('click', handleCorrectGrammar);
    copyBtnEl.addEventListener('click', handleCopyText);
    saveMistakesBtnEl.addEventListener('click', handleSaveWords);
    
    // --- NEW IMPLEMENTATION: Correct on Enter keydown ---
    grammarInputEl.addEventListener('keydown', e => {
        // Only trigger on Enter, not Shift+Enter (which is for a new line)
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            handleCorrectGrammar(); 
        }
    });
}