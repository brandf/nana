// Client-side search functionality using Lunr.js
class SearchManager {
  constructor() {
    this.index = null;
    this.documents = {};
    this.isLoaded = false;
    this.searchContainer = null;
    this.searchInput = null;
    this.resultsContainer = null;
    this.isVisible = false;
    
    this.init();
  }

  async init() {
    // Create search UI
    this.createSearchUI();
    
    // Load search index
    await this.loadSearchIndex();
    
    // Set up event listeners
    this.setupEventListeners();
    
    console.log('Search system initialized');
  }

  createSearchUI() {
    // Create search container
    this.searchContainer = document.createElement('div');
    this.searchContainer.id = 'search-container';
    this.searchContainer.className = 'search-container';
    this.searchContainer.style.display = 'none';

    // Create search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search documentation...';
    this.searchInput.className = 'search-input';
    this.searchInput.id = 'search-input';

    // Create results container
    this.resultsContainer = document.createElement('div');
    this.resultsContainer.className = 'search-results';
    this.resultsContainer.id = 'search-results';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'search-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => this.hide();

    // Assemble the search UI
    this.searchContainer.appendChild(closeButton);
    this.searchContainer.appendChild(this.searchInput);
    this.searchContainer.appendChild(this.resultsContainer);

    // Add to page
    document.body.appendChild(this.searchContainer);
  }

  async loadSearchIndex() {
    try {
      const response = await fetch('/assets/js/search-index.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const searchData = await response.json();
      
      // Rebuild Lunr index from JSON
      this.index = lunr.Index.load(searchData.index);
      this.documents = searchData.documents;
      
      this.isLoaded = true;
      console.log('Search index loaded successfully');
    } catch (error) {
      console.warn('Failed to load search index:', error.message);
      this.isLoaded = false;
    }
  }

  setupEventListeners() {
    // Keyboard shortcut (/) to open search
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      if (e.key === '/' && !this.isVisible) {
        e.preventDefault();
        this.show();
      }
      
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });

    // Search input events
    this.searchInput.addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (this.isVisible && !this.searchContainer.contains(e.target)) {
        this.hide();
      }
    });
  }

  show() {
    this.searchContainer.style.display = 'block';
    this.searchInput.focus();
    this.isVisible = true;
    
    // Add body class to prevent scrolling
    document.body.classList.add('search-open');
    
    // Clear previous results
    this.resultsContainer.innerHTML = '';
  }

  hide() {
    this.searchContainer.style.display = 'none';
    this.searchInput.value = '';
    this.isVisible = false;
    
    // Remove body class
    document.body.classList.remove('search-open');
    
    // Clear results
    this.resultsContainer.innerHTML = '';
  }

  performSearch(query) {
    if (!this.isLoaded || !query.trim()) {
      this.resultsContainer.innerHTML = '';
      return;
    }

    try {
      const results = this.index.search(query);
      this.displayResults(results, query);
    } catch (error) {
      console.warn('Search error:', error.message);
      this.resultsContainer.innerHTML = '<div class="search-error">Search error occurred</div>';
    }
  }

  displayResults(results, query) {
    if (results.length === 0) {
      this.resultsContainer.innerHTML = `
        <div class="search-no-results">
          <p>No results found for "${query}"</p>
          <p class="search-suggestions">Try different keywords or check spelling</p>
        </div>
      `;
      return;
    }

    const resultsHtml = results.map(result => {
      const doc = this.documents[result.ref];
      if (!doc) return '';

      const title = this.highlightText(doc.title, query);
      const description = doc.description ? this.highlightText(doc.description, query) : '';
      const url = doc.url.startsWith('/') ? doc.url : '/' + doc.url;

      return `
        <div class="search-result" onclick="window.location.href='${url}'">
          <h3 class="search-result-title">${title}</h3>
          ${description ? `<p class="search-result-description">${description}</p>` : ''}
          <span class="search-result-url">${url}</span>
        </div>
      `;
    }).join('');

    this.resultsContainer.innerHTML = `
      <div class="search-results-header">
        <span>${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"</span>
      </div>
      ${resultsHtml}
    `;
  }

  highlightText(text, query) {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Initialize search when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if Lunr is available
  if (typeof lunr !== 'undefined') {
    new SearchManager();
  } else {
    console.warn('Lunr.js not loaded - search functionality disabled');
  }
});
