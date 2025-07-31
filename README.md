# Image Details Inspector

A Chrome extension that helps you inspect and analyze images on any webpage. View detailed information about image dimensions, aspect ratios, and file details with an interactive overlay system.

## Features

- **Three Operation Modes**: Choose between Inspector mode, Show All mode, or turn off completely
- **Detailed Image Information**: View both intrinsic (original) and rendered dimensions
- **Aspect Ratio Calculations**: See aspect ratios in both ratio format (16:9) and decimal format (1.78)
- **Smart Positioning**: Overlays automatically position themselves to avoid blocking content
- **Advanced Filtering**: Filter images by file type and minimum size
- **Color-coded Overlays**: Each image gets a unique color for easy identification

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension folder
5. The Image Details Inspector icon will appear in your toolbar

## How to Use

### Getting Started

1. Navigate to any webpage with images
2. Click the Image Details Inspector icon in your Chrome toolbar
3. Choose your preferred mode from the popup

### Operation Modes

#### 🔍 Inspector Mode
- **How it works**: Hover over any image to see its details
- **Best for**: Selectively inspecting specific images
- **Features**:
  - Hover to show details, move away to hide
  - Prevents navigation when clicking on linked images
  - Visual highlight border around hovered images

#### 📊 Show All Mode
- **How it works**: Displays details for all images on the page simultaneously
- **Best for**: Getting an overview of all images at once
- **Features**:
  - Permanent overlays for all qualifying images
  - Advanced filtering options
  - Batch analysis of image properties

#### ⭕ Off Mode
- **How it works**: Disables all functionality
- **Best for**: Normal browsing without any overlays

### Understanding the Information Display

Each overlay shows:

```
File: image-name.jpg

Intrinsic: 1920×1080
Aspect ratio: 16:9 (1.78)

Rendered: 960×540  
Aspect ratio: 16:9 (1.78)
```

- **File**: The image filename
- **Intrinsic**: Original image dimensions (natural size)
- **Rendered**: How the image appears on the page (may be scaled)
- **Aspect ratio**: Both simplified ratio (16:9) and decimal (1.78) formats

### Advanced Filtering (Show All Mode)

When using "Show All" mode, you can filter which images are displayed:

#### Filter by File Type
- Check/uncheck image formats (JPG, PNG, WebP, SVG, etc.)
- Only selected formats will show overlays
- Useful for focusing on specific image types

#### Minimum Size Filter
- Set a minimum width in pixels
- Images smaller than this width won't show overlays
- Helps filter out small icons, buttons, or decorative images

### Tips for Best Results

1. **Use Inspector Mode** for detailed analysis of specific images
2. **Use Show All Mode** to get a quick overview of all images on a page
3. **Apply filters** in Show All mode to reduce clutter on image-heavy pages
4. **Check both intrinsic and rendered sizes** to identify scaling issues
5. **Look for aspect ratio differences** to spot distorted images

## Supported Image Formats

- **Standard formats**: JPG, JPEG, PNG, GIF, BMP, ICO
- **Modern formats**: WebP, AVIF, HEIF, HEIC
- **Vector format**: SVG
- **Data URLs**: Base64 encoded images

## Technical Details

### Browser Compatibility
- Chrome (Manifest V3)
- Based on modern Chrome Extension APIs

### Permissions Required
- **activeTab**: Access to the current webpage
- **scripting**: Inject scripts to analyze images
- **storage**: Save your preferences and settings

### Performance Notes
- Lightweight and efficient
- Only processes images when activated
- Minimal impact on page loading
- Settings persist across browser sessions

## Troubleshooting

### Images Not Showing Overlays
1. Ensure the extension is enabled
2. Check if images have valid file extensions
3. Verify minimum size filter isn't too restrictive
4. Try refreshing the page and reactivating

### Overlays in Wrong Position
- This can happen on pages with complex layouts
- Try scrolling or zooming to refresh positions
- Switch modes off and on to reset

### Extension Not Working
1. Check that Developer Mode is enabled
2. Try disabling and re-enabling the extension
3. Refresh the webpage after making changes

## Privacy & Security

- **No data collection**: Extension doesn't collect or transmit any data
- **Local processing**: All analysis happens in your browser
- **No external requests**: Extension works entirely offline
- **Minimal permissions**: Only requests necessary permissions

## Development

### File Structure
```
image-checker-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── imageDetails.js       # Show All mode logic
├── inspectorMode.js      # Inspector mode logic
└── icons/               # Extension icons
```

### Key Technologies
- **Manifest V3**: Latest Chrome extension standard
- **Content Scripts**: For webpage interaction
- **Chrome Storage API**: Settings persistence
- **Chrome Scripting API**: Dynamic script injection

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is open source. Feel free to use, modify, and distribute according to your needs.

---

**Version**: 1.2  
**Compatibility**: Chrome (Manifest V3)  
**Last Updated**: 2024