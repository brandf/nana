#!/usr/bin/env node

import { globby } from 'globby';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const docsDir = path.join(projectRoot, 'docs');

// Find all markdown files
const markdownFiles = await globby('**/*.md', { 
  cwd: docsDir,
  ignore: ['**/node_modules/**']
});

console.log(`Checking ${markdownFiles.length} markdown files for broken links...`);

let brokenLinks = 0;

for (const file of markdownFiles) {
  const filePath = path.join(docsDir, file);
  const content = await fs.readFile(filePath, 'utf8');
  
  // Find all markdown links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, linkText, linkUrl] = match;
    
    // Skip external links
    if (linkUrl.startsWith('http') || linkUrl.startsWith('mailto:')) {
      continue;
    }
    
    // Skip anchor links
    if (linkUrl.startsWith('#')) {
      continue;
    }
    
    // Resolve relative path
    const targetPath = path.resolve(path.dirname(filePath), linkUrl);
    
    // Check if file exists
    if (!await fs.pathExists(targetPath)) {
      console.log(`❌ Broken link in ${file}: "${linkText}" → ${linkUrl}`);
      brokenLinks++;
    }
  }
}

if (brokenLinks === 0) {
  console.log('✅ All internal links are valid!');
} else {
  console.log(`❌ Found ${brokenLinks} broken links`);
  process.exit(1);
}

