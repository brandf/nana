#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Monitor GitHub Actions deployment and open site when ready
async function monitorDeployment() {
  console.log('🚀 Monitoring GitHub Actions deployment...\n');
  
  const maxAttempts = 30; // 5 minutes max
  const delayMs = 10000; // Check every 10 seconds
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Checking deployment status...`);
      
      // Check if GitHub Actions workflow is running
      const { stdout } = await execAsync('gh run list --limit 1 --json status,conclusion,headBranch');
      
      if (stdout.trim()) {
        const runs = JSON.parse(stdout);
        if (runs.length > 0) {
          const latestRun = runs[0];
          
          if (latestRun.headBranch === 'master') {
            if (latestRun.status === 'completed') {
              if (latestRun.conclusion === 'success') {
                console.log('✅ Deployment completed successfully!');
                console.log('🌐 Opening live site...');
                
                // Open the live site
                await execAsync('start https://brandf.github.io/nana');
                console.log('🎉 Site opened in browser!');
                return;
              } else {
                console.log('❌ Deployment failed:', latestRun.conclusion);
                return;
              }
            } else if (latestRun.status === 'in_progress') {
              console.log('🔄 Deployment in progress...');
            } else {
              console.log('⏸️  Deployment status:', latestRun.status);
            }
          }
        }
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000} seconds before next check...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.log('⚠️  Error checking deployment status:', error.message);
      
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000} seconds before retry...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.log('⏰ Timeout reached. Opening site anyway...');
  await execAsync('start https://brandf.github.io/nana');
  console.log('🌐 Site opened in browser!');
}

// Alternative method using web requests if GitHub CLI is not available
async function monitorDeploymentWeb() {
  console.log('🚀 Monitoring deployment via web requests...\n');
  
  const maxAttempts = 30;
  const delayMs = 10000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`⏳ Attempt ${attempt}/${maxAttempts} - Testing site availability...`);
      
      // Try to fetch the main page
      const response = await fetch('https://brandf.github.io/nana/');
      
      if (response.ok) {
        console.log('✅ Site is live and accessible!');
        console.log('🌐 Opening live site...');
        
        // Open the live site
        await execAsync('start https://brandf.github.io/nana');
        console.log('🎉 Site opened in browser!');
        return;
      } else {
        console.log(`⏸️  Site not ready yet (status: ${response.status})`);
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000} seconds before next check...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
    } catch (error) {
      console.log('⚠️  Site not ready yet:', error.message);
      
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000} seconds before retry...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  console.log('⏰ Timeout reached. Opening site anyway...');
  await execAsync('start https://brandf.github.io/nana');
  console.log('🌐 Site opened in browser!');
}

// Main function
async function main() {
  try {
    // Try GitHub CLI first, fallback to web requests
    await execAsync('gh --version');
    console.log('📱 Using GitHub CLI to monitor deployment...');
    await monitorDeployment();
  } catch (error) {
    console.log('📱 GitHub CLI not available, using web requests...');
    await monitorDeploymentWeb();
  }
}

main().catch(console.error);
