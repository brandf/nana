import fs from 'fs-extra';
import path from 'path';

// Simple template engine
export class TemplateEngine {
    constructor(templatesDir) {
        this.templatesDir = templatesDir;
        this.cache = new Map();
    }

    async loadTemplate(templateName) {
        if (this.cache.has(templateName)) {
            return this.cache.get(templateName);
        }

        const templatePath = path.join(this.templatesDir, templateName);
        const template = await fs.readFile(templatePath, 'utf8');
        this.cache.set(templateName, template);
        return template;
    }

    render(templateName, data) {
        const template = this.cache.get(templateName);
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }

        let html = template;

        // Handle loops {{#each array}}...{{/each}} FIRST
        html = html.replace(/\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}/g, (match, arrayName, content) => {
            const array = data[arrayName] || [];
            return array.map(item => {
                let itemHtml = content;
                // Replace placeholders within the loop context
                for (const [key, value] of Object.entries(item)) {
                    const placeholder = new RegExp(`{{${key}}}`, 'g');
                    itemHtml = itemHtml.replace(placeholder, value || '');
                }
                return itemHtml;
            }).join('');
        });

        // Handle conditional blocks {{#if condition}}...{{/if}}
        html = html.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}/g, (match, condition, content) => {
            return data[condition] ? content : '';
        });

        // Simple template replacement LAST (so it doesn't override loop replacements)
        for (const [key, value] of Object.entries(data)) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(placeholder, value || '');
        }

        return html;
    }

    async renderTemplate(templateName, data) {
        await this.loadTemplate(templateName);
        return this.render(templateName, data);
    }
}

// Helper function to generate breadcrumbs
export function generateBreadcrumbs(route, baseUrl) {
    if (route === '/' || route === '') {
        return '';
    }

    const parts = route.split('/').filter(part => part);
    const breadcrumbItems = [];

    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
        currentPath += parts[i];
        
        // Determine title and href
        let title = parts[i];
        let href = currentPath;
        
        // Special cases for index pages
        if (parts[i] === 'index' && i === parts.length - 1) {
            title = 'README';
            href = currentPath.replace('/index', '/');
        } else if (i === parts.length - 1 && !parts[i].endsWith('.html')) {
            href = currentPath + '.html';
        } else if (i === parts.length - 1 && parts[i].endsWith('.html')) {
            href = currentPath;
        }

        breadcrumbItems.push({
            title: title.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            href: href
        });

        currentPath += '/';
    }

    return breadcrumbItems;
}

// Helper function to determine base URL for assets
export function getBaseUrl(route) {
    // Calculate relative path depth for proper asset linking
    const depth = route.split('/').filter(part => part && part !== 'index').length;
    
    if (depth === 0) {
        // Root level - use relative paths
        return './';
    } else {
        // Subdirectory - use relative paths with appropriate depth
        return '../'.repeat(depth);
    }
}
