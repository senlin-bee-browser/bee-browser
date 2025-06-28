import type { MessageType } from '@types/app-types';

class ContentScript {
  private isInitialized = false;
  private pageAnalysisData: any = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    this.setupMessageListener();
    this.analyzePageContent();
    this.isInitialized = true;
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: MessageType, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true;
      }
    );
  }

  private handleMessage(
    message: MessageType,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): void {
    switch (message.type) {
      case 'ANALYZE_TAB':
        this.analyzePageContent();
        sendResponse({ 
          success: true, 
          data: this.pageAnalysisData 
        });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  private analyzePageContent(): void {
    try {
      const content = this.extractPageContent();
      const metadata = this.extractMetadata();
      const links = this.extractLinks();
      
      this.pageAnalysisData = {
        content,
        metadata,
        links,
        timestamp: Date.now(),
        url: window.location.href
      };

      this.sendToBackground();
    } catch (error) {
      console.error('Error analyzing page content:', error);
    }
  }

  private extractPageContent(): string {
    const title = document.title || '';
    
    const metaDescription = document.querySelector('meta[name="description"]')
      ?.getAttribute('content') || '';
    
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(heading => ({
        level: parseInt(heading.tagName.substring(1)),
        text: heading.textContent?.trim() || ''
      }))
      .filter(h => h.text.length > 0)
      .slice(0, 20);
    
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent?.trim() || '')
      .filter(text => text.length > 30)
      .slice(0, 10);
    
    const listItems = Array.from(document.querySelectorAll('li'))
      .map(li => li.textContent?.trim() || '')
      .filter(text => text.length > 10)
      .slice(0, 15);

    return JSON.stringify({
      title,
      metaDescription,
      headings,
      paragraphs: paragraphs.map(p => p.substring(0, 200)),
      listItems: listItems.map(li => li.substring(0, 100))
    });
  }

  private extractMetadata(): any {
    const metadata: any = {
      url: window.location.href,
      domain: window.location.hostname,
      path: window.location.pathname,
      title: document.title,
      language: document.documentElement.lang || 'en',
      charset: document.characterSet || 'UTF-8'
    };

    const metaTags = Array.from(document.querySelectorAll('meta'));
    metaTags.forEach(meta => {
      const name = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('http-equiv');
      const content = meta.getAttribute('content');
      
      if (name && content) {
        metadata[name] = content;
      }
    });

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      metadata.canonical = canonicalLink.getAttribute('href');
    }

    const structuredData = this.extractStructuredData();
    if (structuredData.length > 0) {
      metadata.structuredData = structuredData;
    }

    return metadata;
  }

  private extractStructuredData(): any[] {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const structuredData: any[] = [];

    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent || '');
        structuredData.push(data);
      } catch (error) {
        console.warn('Error parsing structured data:', error);
      }
    });

    return structuredData;
  }

  private extractLinks(): any[] {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent?.trim() || '',
        title: link.getAttribute('title') || ''
      }))
      .filter(link => {
        const href = link.href;
        return href && 
               !href.startsWith('#') && 
               !href.startsWith('javascript:') && 
               !href.startsWith('mailto:') &&
               !href.startsWith('tel:') &&
               link.text.length > 0;
      })
      .slice(0, 50);

    return links;
  }

  private sendToBackground(): void {
    if (this.pageAnalysisData) {
      chrome.runtime.sendMessage({
        type: 'TAB_UPDATED',
        payload: {
          tabId: chrome.runtime.id,
          analysisData: this.pageAnalysisData
        }
      }).catch(error => {
        console.warn('Could not send message to background:', error);
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ContentScript();
  });
} else {
  new ContentScript();
}