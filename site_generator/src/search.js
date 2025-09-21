import lunr from 'lunr';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SearchIndexBuilder {
  constructor() {
    this.index = null;
    this.documents = [];
  }

  // Extract text content from HTML (simple implementation)
  extractTextFromHtml(html) {
    // Remove HTML tags and decode entities
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
      .replace(/<style[^>]*>.*?<\/style>/gi, '')   // Remove style tags
      .replace(/<[^>]+>/g, ' ')                    // Remove HTML tags
      .replace(/&nbsp;/g, ' ')                     // Replace &nbsp;
      .replace(/&amp;/g, '&')                      // Replace &amp;
      .replace(/&lt;/g, '<')                       // Replace &lt;
      .replace(/&gt;/g, '>')                       // Replace &gt;
      .replace(/&quot;/g, '"')                     // Replace &quot;
      .replace(/&#39;/g, "'")                      // Replace &#39;
      .replace(/\s+/g, ' ')                        // Normalize whitespace
      .trim();
  }

  // Extract headings from HTML for better search
  extractHeadings(html) {
    const headingMatches = html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    return headingMatches.map(heading => 
      heading.replace(/<[^>]+>/g, '').trim()
    ).filter(heading => heading.length > 0);
  }

  // Add a document to the search index
  addDocument(route, title, html, frontmatter = {}) {
    const text = this.extractTextFromHtml(html);
    const headings = this.extractHeadings(html);
    
    // Skip very short documents
    if (text.length < 50) return;

    const doc = {
      id: route,
      title: title || 'Untitled',
      content: text,
      headings: headings.join(' '),
      description: frontmatter.description || '',
      tags: frontmatter.tags ? frontmatter.tags.join(' ') : '',
      url: route === '/index' ? '/' : route
    };

    this.documents.push(doc);
  }

  // Build the Lunr search index
  buildIndex() {
    this.index = lunr(function () {
      // Define the fields to index
      this.field('title', { boost: 10 });
      this.field('headings', { boost: 5 });
      this.field('content', { boost: 1 });
      this.field('description', { boost: 3 });
      this.field('tags', { boost: 2 });

      // Add documents to the index
      this.documents.forEach(doc => {
        this.add(doc);
      });
    });
  }

  // Search the index
  search(query, limit = 10) {
    if (!this.index) {
      this.buildIndex();
    }

    try {
      const results = this.index.search(query);
      return results
        .slice(0, limit)
        .map(result => {
          const doc = this.documents.find(d => d.id === result.ref);
          return {
            ...doc,
            score: result.score,
            matchData: result.matchData
          };
        });
    } catch (error) {
      console.warn('Search error:', error.message);
      return [];
    }
  }

  // Generate search index JSON for client-side use
  generateSearchData() {
    if (!this.index) {
      this.buildIndex();
    }

    return {
      index: this.index.toJSON(),
      documents: this.documents.reduce((acc, doc) => {
        acc[doc.id] = {
          title: doc.title,
          url: doc.url,
          description: doc.description
        };
        return acc;
      }, {})
    };
  }

  // Save search index to file
  async saveSearchIndex(outputDir) {
    const searchData = this.generateSearchData();
    const indexPath = path.join(outputDir, 'assets', 'js', 'search-index.json');
    
    await fs.ensureDir(path.dirname(indexPath));
    await fs.writeJson(indexPath, searchData, { spaces: 2 });
    
    console.log(`Search index saved: ${indexPath}`);
    return indexPath;
  }
}
