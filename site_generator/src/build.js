#!/usr/bin/env node

import { globby } from 'globby';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { TemplateEngine, generateBreadcrumbs, getBaseUrl } from './template-engine.js';
import { NavigationBuilder } from './navigation.js';
import { SearchIndexBuilder } from './search.js';

async function build() {
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(projectRoot, 'docs');
const outputDir = path.join(projectRoot, 'exports', 'website');
const templatesDir = path.join(__dirname, 'templates');
const assetsDir = path.join(__dirname, 'assets');

// Initialize template engine
const templateEngine = new TemplateEngine(templatesDir);

// Clean output directory
await fs.remove(outputDir);
await fs.ensureDir(outputDir);

// Copy assets
await fs.copy(assetsDir, path.join(outputDir, 'assets'));

// Copy robots.txt
await fs.copy(path.join(assetsDir, 'robots.txt'), path.join(outputDir, 'robots.txt'));

// Discover all markdown files
const markdownFiles = await globby('**/*.md', { 
  cwd: docsDir,
  ignore: ['**/node_modules/**']
});

console.log(`Found ${markdownFiles.length} markdown files`);

// Helper function to resolve internal links
function resolveInternalLink(linkUrl, currentRoute, baseUrl) {
  // If link starts with /, it's absolute from root
  if (linkUrl.startsWith('/')) {
    return `${baseUrl}${linkUrl.substring(1)}`;
  }
  
  // For relative links, we need to resolve them based on current route
  const currentDir = currentRoute === '/' ? '' : currentRoute.replace(/\/$/, '');
  const linkPath = linkUrl.startsWith('./') ? linkUrl.substring(2) : linkUrl;
  
  // Build the full path
  let fullPath;
  if (currentDir === '') {
    // We're at root
    fullPath = linkPath;
  } else {
    // We're in a subdirectory
    fullPath = `${currentDir}/${linkPath}`;
  }
  
  // Normalize the path (remove double slashes, etc.)
  fullPath = fullPath.replace(/\/+/g, '/');
  
  // Add baseUrl for relative navigation
  const result = `${baseUrl}${fullPath}`;
  return result.replace(/\/+/g, '/');
}

// Proper markdown to HTML converter using marked
function markdownToHtml(markdown, baseUrl = './', currentRoute = '/') {
  try {
    // Configure marked for GitHub Flavored Markdown
    marked.setOptions({
      gfm: true, // GitHub Flavored Markdown
      breaks: true, // Convert \n to <br>
      tables: true, // Support tables
      sanitize: false, // Allow HTML
      smartLists: true,
      smartypants: true,
      baseUrl: null // Explicitly disable base URL processing
    });

    // Process markdown with marked
    let html = marked.parse(markdown);

    // Fix malformed URLs (missing slashes)
    html = html.replace(/https:\/brandf\.github\.io/g, 'https://brandf.github.io');
    
    // Process links - convert internal .md links to .html
    html = html.replace(/<a href="([^"]+)">([^<]+)<\/a>/gim, (match, linkUrl, linkText) => {
      // Skip external links
      if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:') || linkUrl.startsWith('#')) {
        return match;
      }
      
      // Convert internal .md links to .html
      if (linkUrl.endsWith('.md')) {
        const htmlUrl = linkUrl.replace('.md', '.html');
        const resolvedUrl = resolveInternalLink(htmlUrl, currentRoute, baseUrl);
        return `<a href="${resolvedUrl}">${linkText}</a>`;
      }
      
      // Handle relative paths
      const resolvedUrl = resolveInternalLink(linkUrl, currentRoute, baseUrl);
      return `<a href="${resolvedUrl}">${linkText}</a>`;
    });

    return html;
  } catch (error) {
    console.error('Error processing markdown:', error);
    return `<p>Error processing markdown: ${error.message}</p>`;
  }
}

// Process each markdown file
const pages = [];
for (const file of markdownFiles) {
  const filePath = path.join(docsDir, file);
  const content = await fs.readFile(filePath, 'utf8');
  const { data: frontmatter, content: markdown } = matter(content);
  
  // Generate route
  let route = '/' + file
    .replace(/\\/g, '/')
    .replace(/\.md$/, '');
  
  // Handle README files - they become index pages
  if (route.endsWith('/README')) {
    route = route.replace('/README', '/');
  } else if (route === '/README') {
    route = '/';
  }
  
  // Generate base URL for this page
  const baseUrl = getBaseUrl(route);
  
  // Process markdown to HTML
  const html = markdownToHtml(markdown, baseUrl, route);
  
  const page = {
    route,
    title: frontmatter.title || path.basename(file, '.md'),
    content: html,
    frontmatter,
    sourceFile: file
  };
  
  pages.push(page);
}

// Initialize navigation builder
const navigationBuilder = new NavigationBuilder(pages);

// Initialize search index builder
const searchIndexBuilder = new SearchIndexBuilder();

// Process each page for rendering
for (const page of pages) {
  const route = page.route;
  
  // Remove duplicate H1 if it matches the page title
  const pageTitle = navigationBuilder.getPageTitle(page);
  const duplicateH1Regex = new RegExp(`<h1>${pageTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h1>`, 'i');
  page.content = page.content.replace(duplicateH1Regex, '');
  
  // Generate breadcrumbs and base URL
  const breadcrumbItems = generateBreadcrumbs(route, '');
  const baseUrl = getBaseUrl(route);
  
  // Generate navigation elements
  const sidebarNavigation = navigationBuilder.generateSidebarNavigation(route);
  const tableOfContents = navigationBuilder.generateTableOfContents(page.content, route);
  const pageNavigation = navigationBuilder.generatePreviousNextNavigation(route);
  
  // Render template
  const templateData = {
    title: pageTitle,
    subtitle: page.frontmatter.subtitle || '',
    description: page.frontmatter.description || `Documentation for ${pageTitle}`,
    content: page.content,
    baseUrl: baseUrl,
    breadcrumbs: breadcrumbItems.length > 0 ? 
      `<nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><a href="${baseUrl}index.html">Home</a></li>
          ${breadcrumbItems.map((item, index) => 
            `<li>${index === breadcrumbItems.length - 1 ? 
              `<span aria-current="page">${item.title}</span>` : 
              `<a href="${baseUrl}${item.href}">${item.title}</a>`
            }</li>`
          ).join('')}
        </ol>
      </nav>` : '',
    sidebarNavigation: sidebarNavigation,
    tableOfContents: tableOfContents,
    pageNavigation: pageNavigation,
    year: new Date().getFullYear()
  };
  
  const fullHtml = await templateEngine.renderTemplate('layout.html', templateData);
  
  // Add to search index
  searchIndexBuilder.addDocument(route, pageTitle, fullHtml, page.frontmatter);
  
  // Write HTML file
  let outputPath;
  if (route === '/') {
    outputPath = path.join(outputDir, 'index.html');
  } else if (route.endsWith('/')) {
    // For routes ending with /, create index.html in that directory
    outputPath = path.join(outputDir, route.slice(1), 'index.html');
  } else {
    // For regular routes, create .html file
    outputPath = path.join(outputDir, route.slice(1) + '.html');
  }
  await fs.ensureDir(path.dirname(outputPath));
  
  await fs.writeFile(outputPath, fullHtml);
  console.log(`Generated: ${outputPath}`);
}

const teacherPages = pages.filter(p => p.route.startsWith('/teacher_toolkit'));
const grantPages = pages.filter(p => p.route.startsWith('/grant_toolkit'));
const roadmapPages = pages.filter(p => p.route.startsWith('/roadmaps'));

// Create index page using template
const indexData = {
  title: 'Nana Documentation',
  description: 'Comprehensive toolkits for supporting students with learning disabilities',
  baseUrl: './',
  teacherPages: teacherPages.map(p => ({
    title: navigationBuilder.getPageTitle(p),
    href: p.route.endsWith('/') ? p.route.slice(1) + 'index.html' : p.route.slice(1) + '.html'
  })),
  grantPages: grantPages.map(p => ({
    title: navigationBuilder.getPageTitle(p),
    href: p.route.endsWith('/') ? p.route.slice(1) + 'index.html' : p.route.slice(1) + '.html'
  })),
  roadmapPages: roadmapPages.map(p => ({
    title: navigationBuilder.getPageTitle(p),
    href: p.route.endsWith('/') ? p.route.slice(1) + 'index.html' : p.route.slice(1) + '.html'
  }))
};


const indexHtml = await templateEngine.renderTemplate('index.html', indexData);
await fs.writeFile(path.join(outputDir, 'index.html'), indexHtml);
console.log(`Generated: ${path.join(outputDir, 'index.html')}`);

// Generate sitemap
await navigationBuilder.generateSitemap(outputDir);
console.log(`Generated: ${path.join(outputDir, 'sitemap.xml')}`);

// Generate search index
await searchIndexBuilder.saveSearchIndex(outputDir);
console.log('Search index generated successfully');

console.log(`\nBuild complete! Generated ${pages.length + 1} pages.`);
console.log(`Output directory: ${outputDir}`);
}

// Run the build
build().catch(console.error);