# AGENTS.md

## Project Overview

This repository contains a Chrome extension that inspects images on a webpage and reports information about them.

The extension provides two main modes:

- **Show All Mode**: Displays details about all images on the page.
- **Inspector Mode**: Allows the user to hover or select individual images to inspect.

## Architecture

manifest.json
Defines extension permissions, scripts, and entry points.

popup.html
UI shown when the extension icon is clicked.

popup.js
Handles popup UI logic and communication with the active tab.

background.js
Service worker that manages extension lifecycle and messaging.

imageDetails.js
Implements the logic for gathering and displaying information about all images on the page.

inspectorMode.js
Handles the interactive image inspection functionality.

icons/
Extension icon assets.

## Development Notes

This extension uses **plain JavaScript with no build system**.

Files are loaded directly by Chrome according to `manifest.json`.

There are no external dependencies.

This extension uses Manifest V3.

Background logic runs in a service worker.

## Testing Changes

To test changes:

1. Open Chrome
2. Navigate to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the repository folder
6. Reload the extension after making changes

## Coding Guidelines

- Keep the extension dependency-free.
- Avoid adding build tools unless absolutely necessary.
- Maintain clear separation between popup UI logic and page inspection logic.
- Avoid modifying `manifest.json` unless required for functionality.

## Safe Changes

Agents may safely:

- Improve image detection logic
- Improve UI in popup.html
- Fix bugs in inspector or show-all modes
- Improve code clarity and comments

Agents should avoid:

- Adding new frameworks
- Adding external dependencies
- Changing extension permissions without justification