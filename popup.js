document.getElementById('checkImages').addEventListener('click', async () => {
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