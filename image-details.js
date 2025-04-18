// Clear any existing overlays first
const existingOverlays = document.querySelectorAll('.image-details-overlay');
existingOverlays.forEach(overlay => overlay.remove());

// Select all images on the page
const images = document.querySelectorAll('img');

// Common image file extensions to check
const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.heif', '.heic'];

// Process each image
images.forEach(img => {
  // Check if the image has a valid file extension (if src is available)
  const src = img.getAttribute('src') || '';
  const hasValidExtension = validExtensions.some(ext => 
    src.toLowerCase().endsWith(ext) || 
    // Also check for images that might not have an extension but correct MIME type in data URLs
    (src.startsWith('data:image/') && 
     validExtensions.some(ext => src.includes(`image/${ext.substring(1)}`)))
  );
  
  // Skip images that don't match our criteria
  if (!hasValidExtension && src.indexOf('data:image/') !== 0) {
    return;
  }
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.className = 'image-details-overlay';
  
  // Position the overlay relative to the image
  const imgRect = img.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  // Style the overlay
  Object.assign(overlay.style, {
    position: 'absolute',
    top: `${imgRect.top + scrollTop}px`,
    left: `${imgRect.left + scrollLeft}px`,
    width: `${imgRect.width}px`,
    padding: '5px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: '12px',
    zIndex: '9999',
    pointerEvents: 'none',
    borderRadius: '3px',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap'
  });
  
  // Get intrinsic dimensions (natural dimensions of the image)
  const intrinsicWidth = img.naturalWidth;
  const intrinsicHeight = img.naturalHeight;
  const intrinsicAspectRatio = (intrinsicWidth / intrinsicHeight).toFixed(2);
  
  // Get rendered dimensions (how the image appears on the page)
  const renderedWidth = Math.round(imgRect.width);
  const renderedHeight = Math.round(imgRect.height);
  const renderedAspectRatio = (renderedWidth / renderedHeight).toFixed(2);
  
  // Create the details text
  overlay.innerHTML = `
    <div style="margin-bottom: 3px">Intrinsic: ${intrinsicWidth}×${intrinsicHeight} (${intrinsicAspectRatio})</div>
    <div>Rendered: ${renderedWidth}×${renderedHeight} (${renderedAspectRatio})</div>
  `;
  
  // Add overlay to the document
  document.body.appendChild(overlay);
});

// Add a small notification that the feature is active
const notification = document.createElement('div');
notification.textContent = 'Image details activated';
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