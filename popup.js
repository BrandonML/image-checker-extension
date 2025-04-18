document.getElementById('checkImages').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['imageDetails.js']
    });
});

document.getElementById('clearDetails').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: clearImageDetails
    });
});

function clearImageDetails() {
    const overlays = document.querySelectorAll('.image-details-overlay');
    overlays.forEach(overlay => overlay.remove());
}