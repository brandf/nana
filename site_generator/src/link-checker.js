#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { globby } from 'globby';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(projectRoot, 'exports', 'website');

// Link checker for the generated site
async function checkLinks() {
  console.log('🔍 Checking links on the generated site...\n');
  
  const htmlFiles = await globby('**/*.html', { cwd: outputDir });
  const baseUrl = 'https://brandf.github.io/nana';
  
  const linkResults = {
    total: 0,
    broken: [],
    working: [],
    external: []
  };
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(outputDir, htmlFile);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Extract all href attributes
    const linkRegex = /href="([^"]+)"/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const linkUrl = match[1];
      linkResults.total++;
      
      // Skip external links
      if (linkUrl.startsWith('http') && !linkUrl.includes('brandf.github.io/nana')) {
        linkResults.external.push({
          file: htmlFile,
          url: linkUrl,
          type: 'external'
        });
        continue;
      }
      
      // Convert to full URL for checking
      let fullUrl;
      if (linkUrl.startsWith('https://brandf.github.io/nana')) {
        fullUrl = linkUrl;
      } else if (linkUrl.startsWith('/')) {
        fullUrl = baseUrl + linkUrl;
      } else {
        // Relative path - need to resolve based on current file location
        const currentDir = path.dirname(htmlFile);
        const resolvedPath = path.resolve(currentDir, linkUrl).replace(/\\/g, '/');
        fullUrl = baseUrl + '/' + resolvedPath;
      }
      
      // Check if this is a valid internal link
      const localPath = fullUrl.replace(baseUrl, '').replace(/^\//, '');
      const localFilePath = path.join(outputDir, localPath);
      
      if (await fs.pathExists(localFilePath)) {
        linkResults.working.push({
          file: htmlFile,
          url: linkUrl,
          fullUrl: fullUrl,
          type: 'working'
        });
      } else {
        linkResults.broken.push({
          file: htmlFile,
          url: linkUrl,
          fullUrl: fullUrl,
          localPath: localPath,
          type: 'broken'
        });
      }
    }
  }
  
  // Report results
  console.log(`📊 Link Check Results:`);
  console.log(`   Total links: ${linkResults.total}`);
  console.log(`   Working: ${linkResults.working.length}`);
  console.log(`   Broken: ${linkResults.broken.length}`);
  console.log(`   External: ${linkResults.external.length}\n`);
  
  if (linkResults.broken.length > 0) {
    console.log('❌ BROKEN LINKS:');
    linkResults.broken.forEach(link => {
      console.log(`   ${link.file}: ${link.url} → ${link.fullUrl}`);
      console.log(`     Expected file: ${link.localPath}`);
    });
    console.log('');
  }
  
  if (linkResults.working.length > 0) {
    console.log('✅ WORKING LINKS:');
    linkResults.working.slice(0, 10).forEach(link => {
      console.log(`   ${link.file}: ${link.url}`);
    });
    if (linkResults.working.length > 10) {
      console.log(`   ... and ${linkResults.working.length - 10} more`);
    }
    console.log('');
  }
  
  // Check for CSS files
  console.log('🎨 CSS Files Check:');
  const cssFiles = await globby('**/*.css', { cwd: outputDir });
  cssFiles.forEach(cssFile => {
    console.log(`   ✅ ${cssFile}`);
  });
  
  if (cssFiles.length === 0) {
    console.log('   ❌ No CSS files found!');
  }
  
  // Check for .nojekyll file
  const nojekyllPath = path.join(outputDir, '.nojekyll');
  if (await fs.pathExists(nojekyllPath)) {
    console.log('   ✅ .nojekyll file exists');
  } else {
    console.log('   ❌ .nojekyll file missing');
  }
  
  return linkResults;
}

// Run the link checker
checkLinks().catch(console.error);
