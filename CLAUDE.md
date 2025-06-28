# Bee Browser - AI-Powered Chrome Extension

## Project Overview
A Chrome browser extension that uses LLM to analyze user's browsing history and open tabs, grouping similar content for intelligent knowledge management.

## Core Features
1. **Tab & History Access**: Monitor active tabs and browser history
2. **AI-Powered Grouping**: Use LLM to semantically group related tabs/pages
3. **Knowledge Management**: Restructure and present grouped content for easy access
4. **Smart Organization**: Help users discover patterns in their browsing behavior
5. **Workspace Experience**: Full-tab React app for comprehensive knowledge management and visualization

## Tech Stack
- **Language**: TypeScript
- **Framework**: Chrome Extension Manifest V3
- **Frontend**: React + TypeScript for full workspace experience
- **UI Components**: Extension popup, sidepanel, and full-tab workspace app
- **Styling**: Tailwind CSS
- **AI Integration**: LLM APIs (OpenAI, Anthropic Claude, or local models)
- **Storage**: Chrome Storage API, IndexedDB
- **Build Tools**: Vite with TypeScript support for static hosting and development

## Project Structure
```
bee-browser/
├── manifest.json              # Chrome extension manifest
├── vite.config.ts            # Vite configuration
├── src/
│   ├── background/           # Background service worker
│   │   ├── service-worker.ts
│   │   └── tab-monitor.ts
│   ├── content/             # Content scripts
│   │   └── content-script.ts
│   ├── popup/               # Extension popup UI (React)
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── components/
│   ├── options/             # Options/settings page (React)
│   │   ├── options.html
│   │   ├── options.tsx
│   │   └── components/
│   ├── sidepanel/           # Chrome side panel (React)
│   │   ├── sidepanel.html
│   │   ├── sidepanel.tsx
│   │   └── components/
│   ├── workspace/           # Full-tab workspace app (React)
│   │   ├── workspace.html
│   │   ├── workspace.tsx
│   │   ├── components/
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── TabGrouping.tsx
│   │   │   ├── SearchInterface.tsx
│   │   │   └── HistoryTimeline.tsx
│   │   └── pages/
│   │       ├── Dashboard.tsx
│   │       ├── Groups.tsx
│   │       └── Analytics.tsx
│   ├── shared/              # Shared React components and hooks
│   │   ├── components/
│   │   ├── hooks/
│   │   └── contexts/
│   ├── types/               # TypeScript type definitions
│   │   ├── chrome-api.d.ts
│   │   └── app-types.d.ts
│   └── utils/               # Utility modules
│       ├── ai-processor.ts
│       ├── storage-manager.ts
│       └── tab-grouper.ts
├── tsconfig.json
├── dist/                    # Built extension files
└── package.json
```

## Required Chrome Permissions
- `tabs` - Access to tab information
- `history` - Access to browsing history
- `storage` - Local data persistence
- `activeTab` - Current tab access
- `host_permissions` - Access to web pages for content extraction

## Development Commands
```bash
# Install dependencies
npm install

# Build for development
npm run build:dev

# Build for production
npm run build

# Watch mode for development
npm run watch

# Type checking
npm run typecheck

# Lint TypeScript
npm run lint

# Run tests
npm run test
```

## Key Dependencies
- `typescript` - TypeScript compiler
- `@types/chrome` - Chrome API type definitions
- `@types/node` - Node.js type definitions
- `vite` - Build tooling and development server
- `react` & `react-dom` - React framework
- `@types/react` & `@types/react-dom` - React type definitions
- `tailwindcss` - CSS framework
- `@vitejs/plugin-react` - Vite React plugin

## Development Notes

### Chrome Extension Specific
- Use Manifest V3 (latest standard)
- Background scripts must be service workers (not persistent background pages)
- Content Security Policy restrictions apply
- All remote code execution must go through extension APIs
- Workspace app opens in new tab for full-featured knowledge management experience
- React components must be built and bundled for extension context

### Privacy Considerations
- Process sensitive browsing data locally when possible
- Provide clear user controls for data collection
- Implement opt-in/opt-out mechanisms
- Follow Chrome Web Store privacy policies

### Performance Guidelines
- Minimize background script CPU usage
- Use efficient storage patterns
- Implement lazy loading for React components
- Optimize LLM API calls to reduce latency
- Use React.memo and useMemo for expensive computations in workspace
- Implement virtual scrolling for large datasets in knowledge views

### Testing Strategy
- Unit tests for utility functions using Jest/Vitest
- React component testing with React Testing Library
- Integration tests for Chrome API interactions
- Manual testing in Chrome developer mode
- Test workspace experience across different screen sizes
- Test across different Chrome versions

## Code Conventions
- Use TypeScript strict mode
- Follow Chrome extension best practices
- Implement proper error handling for all Chrome API calls
- Use async/await patterns for Chrome API promises
- Maintain clear separation between content scripts and background scripts
- Use React functional components with hooks
- Implement proper prop typing with TypeScript interfaces
- Follow React best practices for state management and component composition
- Use consistent file naming: PascalCase for components, camelCase for utilities

## Deployment
1. Build production version: `npm run build`
2. Test in Chrome developer mode
3. Package as .zip file for Chrome Web Store
4. Submit for review following Chrome Web Store policies