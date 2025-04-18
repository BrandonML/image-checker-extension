// Get the state of inspector mode from storage
let inspectorEnabled = false;

// Initialize the UI based on stored state
chrome.storage.local.get(['inspectorEnabled'], function (result) {
    inspectorEnabled = result.inspectorEnabled || false;
    updateUI();
});

// Toggle inspector mode
document.getElementById('enableInspector').addEventListener('change', async (e) => {
    inspectorEnabled = e.target.checked;

    // Save state
    chrome.storage.local.set({ inspectorEnabled });
    updateUI();

    // Apply changes to current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (inspectorEnabled) {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['inspectorMode.js']
        });
    } else {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: disableInspectorMode
        });
    }
});

// Show details for all images on the page
document.getElementById('checkAllImages').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['imageDetails.js']
    });
    window.close();
});

// Clear all details from the page
document.getElementById('clearDetails').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: clearImageDetails
    });
    window.close();
});

// Update UI based on current state
function updateUI() {
    const checkbox = document.getElementById('enableInspector');
    const statusText = document.getElementById('status');

    checkbox.checked = inspectorEnabled;

    if (inspectorEnabled) {
        statusText.textContent = 'Click on images to inspect them';
        statusText.style.color = '#34a853';
    } else {
        statusText.textContent = 'Inspector mode disabled';
        statusText.style.color = '#5f6368';
    }
}

// Function to disable inspector mode on the page
function disableInspectorMode() {
    // Remove any existing overlays
    const overlays = document.querySelectorAll('.image-details-overlay');
    overlays.forEach(overlay => overlay.remove());

    // Remove event listeners
    document.querySelectorAll('img').forEach(img => {
        img.style.cursor = '';
        img.classList.remove('image-inspector-hover');
        img.removeEventListener('click', window.imageInspectorClickHandler);
        img.removeEventListener('mouseover', window.imageInspectorHoverHandler);
        img.removeEventListener('mouseout', window.imageInspectorOutHandler);
    });

    // Remove global click handler
    document.removeEventListener('click', window.documentClickHandler);

    // Remove styles
    const styleElement = document.getElementById('image-inspector-styles');
    if (styleElement) styleElement.remove();

    // Show notification
    const notification = document.createElement('div');
    notification.textContent = 'Image inspector disabled';
    Object.assign(notification.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: '#d93025',
        color: 'white',
        borderRadius: '4px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        transition: 'opacity 0.5s',
        opacity: '1'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}

// Function to clear all image details
function clearImageDetails() {
    const overlays = document.querySelectorAll('.image-details-overlay');

    overlays.forEach(overlay => {
        overlay.style.transition = 'opacity 0.3s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    });

    const notification = document.createElement('div');
    notification.textContent = 'Image details cleared';
    Object.assign(notification.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: '#4285f4',
        color: 'white',
        borderRadius: '4px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        transition: 'opacity 0.5s',
        opacity: '1'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
} document.getElementById('checkImages').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['imageDetails.js']
    });
    // Close the popup after clicking for better UX
    window.close();
});

document.getElementById('clearDetails').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: clearImageDetails
    });
    // Close the popup after clicking for better UX
    window.close();
});

function clearImageDetails() {
    const overlays = document.querySelectorAll('.image-details-overlay');

    // Add a small fade-out animation for smoother UX
    overlays.forEach(overlay => {
        overlay.style.transition = 'opacity 0.3s';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    });

    // Create and show a notification
    const notification = document.createElement('div');
    notification.textContent = 'Image details cleared';
    Object.assign(notification.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: '#4285f4',
        color: 'white',
        borderRadius: '4px',
        zIndex: '10000',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        transition: 'opacity 0.5s',
        opacity: '1'
    });

    document.body.appendChild(notification);

    // Make the notification disappear after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 2000);
}