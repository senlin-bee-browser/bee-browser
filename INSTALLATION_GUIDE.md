# Bee Browser Extension - Installation Guide

## How to Install the Extension (Developer Mode)

### Step 1: Extract the Extension
1. Download the `bee-browser-extension.zip` file
2. Extract/unzip it to a folder on your computer
3. You should see a `dist` folder containing all the extension files

### Step 2: Enable Developer Mode in Chrome
1. Open Google Chrome
2. Go to `chrome://extensions/` (paste this in the address bar)
3. In the top-right corner, toggle **"Developer mode"** ON
4. You should now see additional buttons like "Load unpacked"

### Step 3: Load the Extension
1. Click the **"Load unpacked"** button
2. Navigate to and select the `dist` folder (not the zip file, but the extracted `dist` folder)
3. Click "Select Folder" or "Open"
4. The extension should now appear in your extensions list

### Step 4: Verify Installation
You should see:
- **Bee Browser** extension in your extensions list
- A bee 🐝 icon in your Chrome toolbar
- Extension status should show "On"

## How to Use the Extension

### Quick Access (Popup)
- Click the 🐝 icon in your toolbar
- Use "Analyze Current Tabs" for instant AI-powered tab grouping

### Full Workspace
- Click "Open Workspace" in the popup, OR
- Open a new tab - it will show the Bee Browser workspace

### Side Panel
- Right-click the 🐝 icon → "Open side panel"
- Access tab management in the sidebar

## Features Available
- **AI Tab Analysis**: Automatically categorize and group your tabs
- **Tab Management**: Organize, search, and manage your browsing
- **Group Creation**: Create custom tab groups
- **Analytics**: View your browsing patterns
- **Cross-device Sync**: Manage tabs across different windows

## Troubleshooting

### Extension Not Loading
- Make sure you selected the `dist` folder, not the zip file
- Ensure Developer mode is enabled in `chrome://extensions/`
- Check that all files are properly extracted

### Features Not Working
- Refresh the extension: Go to `chrome://extensions/`, find Bee Browser, click the refresh button
- If tabs aren't grouping, make sure you have multiple tabs open
- Check browser console for any errors

### Permissions
The extension needs these permissions:
- `tabs` - To access and group your tabs
- `tabGroups` - To create and manage tab groups
- `history` - To analyze browsing patterns
- `storage` - To save your preferences
- `activeTab` - To analyze current tab content

## Need Help?
If you encounter any issues:
1. Check the troubleshooting section above
2. Try disabling and re-enabling the extension
3. Contact the developer with specific error messages

---

**Note**: This is a development version of the extension. It's not available on the Chrome Web Store yet, so it needs to be installed manually in developer mode.