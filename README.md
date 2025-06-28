# 🐝 Bee Browser - AI-Powered Chrome Extension

An intelligent Chrome extension that uses AI to analyze browsing history and organize tabs into meaningful knowledge groups for enhanced productivity and information management.

## 🚀 Features

- **AI-Powered Tab Grouping**: Automatically categorize and group similar tabs using LLM analysis
- **Knowledge Management**: Full-featured workspace for managing browsing knowledge
- **Smart Sidepanel**: Quick access to organized content via Chrome's side panel
- **History Analysis**: Intelligent insights into browsing patterns and productivity
- **React-Based UI**: Modern, responsive interface across all extension components

## 🏗️ Architecture

- **Framework**: Chrome Extension Manifest V3 + React 18 + TypeScript
- **Build Tool**: Vite with custom Chrome extension configuration
- **Styling**: Tailwind CSS with custom design system
- **AI Integration**: Configurable LLM providers (OpenAI, Claude, Local)
- **Storage**: Chrome Storage API + IndexedDB for persistence

## 📁 Project Structure

```
bee-browser/
├── src/
│   ├── background/           # Service worker and tab monitoring
│   ├── content/             # Content scripts for web pages  
│   ├── popup/               # Extension popup (React)
│   ├── options/             # Settings page (React)
│   ├── sidepanel/           # Knowledge panel (React)
│   ├── workspace/           # Full-tab workspace app (React)
│   │   ├── components/      # Shared workspace components
│   │   └── pages/          # Dashboard, Groups, Analytics
│   ├── shared/              # Shared React components and utilities
│   │   ├── components/      # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   └── contexts/       # React context providers
│   ├── utils/               # Utility functions and Chrome API helpers
│   └── types/               # TypeScript type definitions
├── dist/                    # Built extension files (auto-generated)
├── manifest.json           # Chrome extension manifest
├── vite.config.ts          # Vite build configuration
└── package.json            # Dependencies and scripts
```

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Chrome** browser for testing
- **TypeScript** knowledge recommended

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bee-browser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   # Development build (faster, unminified)
   npm run build:dev
   
   # Production build (optimized)
   npm run build
   
   # Watch mode (rebuilds on changes)
   npm run watch
   ```

## 🧪 Testing in Chrome

### Load Extension in Developer Mode

1. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle **"Developer mode"** ON (top-right corner)

2. **Load the Extension**
   - Click **"Load unpacked"** button
   - Navigate to your project directory
   - Select the **`dist`** folder (NOT the root folder)
   - Click **"Select Folder"**

3. **Verify Installation**
   - Extension should appear as "Bee Browser" 
   - Click the extension icon to test the popup
   - Try opening sidepanel and workspace features

### Testing Components

| Component | How to Test |
|-----------|-------------|
| **Popup** | Click extension icon in toolbar |
| **Sidepanel** | Click "Open Sidepanel" in popup |
| **Workspace** | Click "Open Workspace" in popup |
| **Options** | Right-click extension → "Options" |

### Development Workflow

1. **Make code changes**
2. **Rebuild extension**
   ```bash
   npm run build:dev
   ```
3. **Refresh extension** in `chrome://extensions/`
4. **Test changes** in Chrome

For faster development, use watch mode:
```bash
npm run watch
```
Then just refresh the extension after each auto-rebuild.

## 📋 Available Scripts

```bash
# Development
npm run dev          # Start Vite dev server (not for extensions)
npm run build:dev    # Build for development (faster)
npm run build        # Build for production (optimized)
npm run watch        # Watch mode with auto-rebuild

# Quality Assurance  
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint code linting
npm run test         # Run tests (when added)

# Cleanup
npm run clean        # Remove dist folder
```

## 🔧 Configuration

### AI Provider Setup

Configure your preferred AI provider in the extension options:

1. **OpenAI**: Requires API key from OpenAI
2. **Claude**: Requires API key from Anthropic  
3. **Local**: Uses local analysis (no API required)

### Extension Permissions

The extension requires these Chrome permissions:
- `tabs` - Access tab information
- `history` - Analyze browsing history
- `storage` - Store user data and preferences
- `activeTab` - Access current tab content
- `sidePanel` - Enable sidepanel functionality

## 🐛 Debugging

### View Console Logs

- **Background Script**: `chrome://extensions/` → Click "service worker"
- **Popup/Options/Workspace**: Right-click → "Inspect" 
- **Content Script**: F12 on any webpage → Console tab

### Common Issues

| Issue | Solution |
|-------|----------|
| Extension won't load | Ensure you selected the `dist/` folder, not root |
| Popup is blank | Check console for React errors |
| Build fails | Run `npm run typecheck` first |
| Permission errors | Check `manifest.json` permissions |

## 📦 Building for Distribution

1. **Create production build**
   ```bash
   npm run build
   ```

2. **Test thoroughly** in Chrome developer mode

3. **Package for Chrome Web Store**
   ```bash
   cd dist
   zip -r ../bee-browser-extension.zip .
   ```

4. **Upload to Chrome Web Store** following their guidelines

## 🤝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **Imports**: Use path aliases (`@shared`, `@utils`, etc.)

### Before Submitting

1. **Type check**: `npm run typecheck`
2. **Build successfully**: `npm run build`
3. **Test in Chrome**: Load extension and verify functionality
4. **Follow existing patterns**: Match the codebase style

## 📄 License

[Add your license here]

## 🆘 Support

For issues and questions:
1. Check the **Debugging** section above
2. Review **Common Issues** table
3. Open an issue in this repository

---

**Happy coding! 🚀**