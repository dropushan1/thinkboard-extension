// js/utils.js

export const formatTimestamp = (unixTimestamp) => {
    if (!unixTimestamp) return '';
    return new Date(unixTimestamp * 1000).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

export const pronounceWord = async (text) => {
    
    // This helper function is now correct and uses async/await.
    const getSpeed = async () => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            const result = await chrome.storage.local.get(['ttsSpeed']);
            return result.ttsSpeed || 1;
        } else {
            return 1;
        }
    };
    
    if ('speechSynthesis' in window) {
        const rate = await getSpeed();
        window.speechSynthesis.cancel();
        
        // CORRECTED: Removed the extra "new" keyword.
        const utterance = new SpeechSynthesisUtterance(text);
        
        utterance.lang = 'en-US';
        utterance.rate = rate; // The correctly loaded speed is applied here.
        
        window.speechSynthesis.speak(utterance);
    } else {
        console.error("Sorry, your browser does not support text-to-speech.");
        alert("Sorry, your browser does not support text-to-speech.");
    }
};