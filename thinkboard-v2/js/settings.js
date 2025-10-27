// js/settings.js

export function initSettingsPage() {
    const speedSlider = document.getElementById('tts-speed-slider');
    const speedValueEl = document.getElementById('tts-speed-value');

    // UPDATED: This is a more robust check for the storage API.
    const isStorageAvailable = () => {
        try {
            // Checks for the chrome object and storage API without relying on `window`.
            return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
        } catch (e) {
            return false;
        }
    };

    // UPDATED: This function now uses async/await to read from storage.
    const loadSpeed = async () => {
        if (isStorageAvailable()) {
            // Await the promise returned by chrome.storage.local.get.
            const result = await chrome.storage.local.get(['ttsSpeed']);
            const savedSpeed = result.ttsSpeed || 1.0;
            speedSlider.value = savedSpeed;
            speedValueEl.textContent = `${parseFloat(savedSpeed).toFixed(1)}x`;
        } else {
            // Fallback behavior remains the same for local file testing.
            const defaultSpeed = 1.0;
            speedSlider.value = defaultSpeed;
            speedValueEl.textContent = `${parseFloat(defaultSpeed).toFixed(1)}x`;
            // The console warning is still useful for debugging.
            console.warn("chrome.storage.local is not available. Load as an unpacked extension to test this feature.");
        }
    };

    // UPDATED: This function now uses async/await to save to storage.
    const handleSliderInput = async () => {
        const newSpeed = speedSlider.value;
        speedValueEl.textContent = `${parseFloat(newSpeed).toFixed(1)}x`;
        
        if (isStorageAvailable()) {
            // Await the promise to ensure the set operation is registered.
            await chrome.storage.local.set({ ttsSpeed: parseFloat(newSpeed) });
        }
    };

    speedSlider.addEventListener('input', handleSliderInput);
    
    // Call the async function to load the initial value.
    loadSpeed();
}