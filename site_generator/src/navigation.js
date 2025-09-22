import fs from 'fs-extra';
import path from 'path';

export class NavigationBuilder {
  constructor(pages) {
    this.pages = pages;
    this.navigationTree = this.buildNavigationTree();
  }

  buildNavigationTree() {
    const tree = {
      teacher_toolkit: {
        title: 'Teacher Toolkit',
        children: {},
        pages: []
      },
      grant_toolkit: {
        title: 'Grant Toolkit', 
        children: {},
        pages: []
      },
      roadmaps: {
        title: 'Roadmaps',
        children: {},
        pages: []
      }
    };

    // Organize pages into navigation structure
    for (const page of this.pages) {
      const route = page.route;
      
      if (route.startsWith('/teacher_toolkit')) {
        this.addToSection(tree.teacher_toolkit, route, page);
      } else if (route.startsWith('/grant_toolkit')) {
        this.addToSection(tree.grant_toolkit, route, page);
      } else if (route.startsWith('/roadmaps')) {
        this.addToSection(tree.roadmaps, route, page);
      }
    }

    return tree;
  }

  addToSection(section, route, page) {
    const pathParts = route.split('/').filter(Boolean);
    
    if (pathParts.length === 1) {
      // Top-level page (like index)
      section.pages.push(page);
    } else {
      // For teacher_toolkit, organize by category
      if (route.startsWith('/teacher_toolkit')) {
        const fileName = pathParts[1];
        
        // Categorize pages
        if (fileName.includes('workflow') || fileName.includes('identify') || fileName.includes('try') || fileName.includes('monitor') || fileName.includes('communicate')) {
          this.addToCategory(section, 'workflows', fileName, page);
        } else if (fileName.includes('tool') || fileName.includes('quick_reference') || fileName.includes('mobile') || fileName.includes('visual') || fileName.includes('observation')) {
          this.addToCategory(section, 'tools', fileName, page);
        } else if (fileName.includes('family') || fileName.includes('communication')) {
          this.addToCategory(section, 'family_communication', fileName, page);
        } else if (fileName.includes('progress') || fileName.includes('monitoring')) {
          this.addToCategory(section, 'progress_monitoring', fileName, page);
        } else if (fileName.includes('resource')) {
          this.addToCategory(section, 'resources', fileName, page);
        } else {
          // Main toolkit pages
          section.pages.push(page);
        }
      } else {
        // For other sections, use the original logic
        const subPath = pathParts.slice(1);
        let current = section;
        
        for (const part of subPath) {
          if (!current.children[part]) {
            current.children[part] = {
              title: this.formatTitle(part),
              children: {},
              pages: []
            };
          }
          current = current.children[part];
        }
        
        current.pages.push(page);
      }
    }
  }

  addToCategory(section, categoryName, fileName, page) {
    if (!section.children[categoryName]) {
      section.children[categoryName] = {
        title: this.formatTitle(categoryName),
        children: {},
        pages: []
      };
    }
    section.children[categoryName].pages.push(page);
  }

  formatTitle(str) {
    return str
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/\.html$/, '');
  }

  getPageTitle(page) {
    // Use frontmatter title if available
    if (page.frontmatter && page.frontmatter.title) {
      return page.frontmatter.title;
    }
    
    // Extract title from first heading in content
    const headingMatch = page.content.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);
    if (headingMatch) {
      return headingMatch[1].replace(/<[^>]*>/g, ''); // Strip HTML tags
    }
    
    // Fall back to formatted filename
    const filename = page.sourceFile.replace(/\.md$/, '');
    return this.formatTitle(filename);
  }

  generateSidebarNavigation(currentRoute = '/') {
    let html = '<nav class="sidebar-nav">\n';
    
    // Main navigation sections
    const sections = [
      { key: 'teacher_toolkit', title: 'Teacher Toolkit', icon: '👩‍🏫' },
      { key: 'grant_toolkit', title: 'Grant Toolkit', icon: '💰' },
      { key: 'roadmaps', title: 'Roadmaps', icon: '🗺️' }
    ];

    for (const section of sections) {
      const sectionData = this.navigationTree[section.key];
      const isActive = currentRoute.startsWith(`/${section.key}`);
      
      html += `  <div class="nav-section ${isActive ? 'active' : ''}">\n`;
      html += `    <h3 class="nav-section-title">${section.icon} ${section.title}</h3>\n`;
      
      if (isActive) {
        html += this.renderSectionContent(sectionData, currentRoute, 2);
      }
      
      html += '  </div>\n';
    }
    
    html += '</nav>';
    return html;
  }

  renderSectionContent(section, currentRoute, indent = 0) {
    const spaces = '  '.repeat(indent);
    let html = '';
    
    // Render main pages first (like index, quick start, etc.)
    for (const page of section.pages) {
      const isActive = page.route === currentRoute;
      const pageTitle = this.getPageTitle(page);
      html += `${spaces}<a href="${this.getRelativePath(page.route, currentRoute)}" class="nav-link ${isActive ? 'active' : ''}">${pageTitle}</a>\n`;
    }
    
    // Render subdirectories/categories
    for (const [key, child] of Object.entries(section.children)) {
      const hasActiveChild = this.hasActiveChild(child, currentRoute);
      html += `${spaces}<div class="nav-subsection ${hasActiveChild ? 'expanded' : ''}">\n`;
      html += `${spaces}  <h4 class="nav-subsection-title">${child.title}</h4>\n`;
      
      // Always show the links for expanded sections, or if it's the teacher toolkit
      if (hasActiveChild || currentRoute.startsWith('/teacher_toolkit')) {
        for (const page of child.pages) {
          const isActive = page.route === currentRoute;
          const pageTitle = this.getPageTitle(page);
          html += `${spaces}  <a href="${this.getRelativePath(page.route, currentRoute)}" class="nav-link ${isActive ? 'active' : ''}">${pageTitle}</a>\n`;
        }
      }
      
      html += `${spaces}</div>\n`;
    }
    
    return html;
  }

  hasActiveChild(section, currentRoute) {
    // Check if any page in this section or its children is active
    for (const page of section.pages) {
      if (page.route === currentRoute) return true;
    }
    
    for (const child of Object.values(section.children)) {
      if (this.hasActiveChild(child, currentRoute)) return true;
    }
    
    return false;
  }

  getRelativePath(targetRoute, currentRoute) {
    // Calculate relative path between current and target routes
    const currentParts = currentRoute.split('/').filter(part => part);
    const targetParts = targetRoute.split('/').filter(part => part);
    
    // Find common path
    let commonLength = 0;
    while (commonLength < currentParts.length && 
           commonLength < targetParts.length && 
           currentParts[commonLength] === targetParts[commonLength]) {
      commonLength++;
    }
    
    // Calculate relative path
    const upLevels = currentParts.length - commonLength;
    const downPath = targetParts.slice(commonLength);
    
    let relativePath = '';
    
    // Add "../" for each level up
    if (upLevels > 0) {
      relativePath = '../'.repeat(upLevels);
    } else if (currentRoute !== '/' && targetRoute !== '/') {
      relativePath = './';
    }
    
    // Add the target path
    if (targetRoute === '/') {
      relativePath += 'index.html';
    } else if (targetRoute.endsWith('/')) {
      relativePath += downPath.join('/') + '/index.html';
    } else {
      relativePath += downPath.join('/') + '.html';
    }
    
    return relativePath;
  }

  generateTableOfContents(content, currentRoute) {
    // Extract headings from HTML content
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const headings = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1]);
      const text = match[2].replace(/<[^>]*>/g, ''); // Strip HTML tags
      const id = this.generateHeadingId(text);
      
      headings.push({ level, text, id });
    }
    
    if (headings.length === 0) return '';
    
    let html = '<nav class="table-of-contents">\n';
    html += '  <h3>Table of Contents</h3>\n';
    html += '  <ol class="toc-list">\n';
    
    for (const heading of headings) {
      const indent = '    '.repeat(heading.level - 1);
      html += `${indent}<li><a href="#${heading.id}">${heading.text}</a></li>\n`;
    }
    
    html += '  </ol>\n';
    html += '</nav>';
    
    return html;
  }

  generateHeadingId(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  generatePreviousNextNavigation(currentRoute) {
    const allPages = this.pages.filter(p => p.route !== '/');
    const currentIndex = allPages.findIndex(p => p.route === currentRoute);
    
    if (currentIndex === -1) return '';
    
    const prev = currentIndex > 0 ? allPages[currentIndex - 1] : null;
    const next = currentIndex < allPages.length - 1 ? allPages[currentIndex + 1] : null;
    
    if (!prev && !next) return '';
    
    let html = '<nav class="page-navigation">\n';
    
    if (prev) {
      const prevPath = this.getRelativePath(prev.route, currentRoute);
      const prevTitle = this.getPageTitle(prev);
      html += `  <a href="${prevPath}" class="nav-prev">← ${prevTitle}</a>\n`;
    }
    
    if (next) {
      const nextPath = this.getRelativePath(next.route, currentRoute);
      const nextTitle = this.getPageTitle(next);
      html += `  <a href="${nextPath}" class="nav-next">${nextTitle} →</a>\n`;
    }
    
    html += '</nav>';
    return html;
  }

  generateSitemap(outputDir) {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${this.pages.map(page => {
  const url = page.route === '/' ? '' : page.route.replace(/\/$/, '');
  return `  <url>
    <loc>https://brandf.github.io/nana${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.route === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    return fs.writeFile(path.join(outputDir, 'sitemap.xml'), sitemap);
  }
}
