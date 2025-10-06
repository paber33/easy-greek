#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// MCP Server for Playwright
class PlaywrightMCPServer {
  constructor() {
    this.version = '1.0.0';
    this.name = 'playwright-mcp';
  }

  async handleRequest(request) {
    const { method, params } = request;

    try {
      switch (method) {
        case 'runTests':
          return await this.runTests(params);
        case 'screenshot':
          return await this.screenshot(params);
        case 'open':
          return await this.open(params);
        case 'getTestResults':
          return await this.getTestResults(params);
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    } catch (error) {
      return {
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }

  async runTests(params = {}) {
    const { testPattern, headless = true, baseURL } = params;
    
    try {
      // Set environment variables
      if (baseURL) {
        process.env.TEST_BASE_URL = baseURL;
      }
      if (headless) {
        process.env.PLAYWRIGHT_HEADLESS = 'true';
      } else {
        process.env.PLAYWRIGHT_HEADLESS = 'false';
      }

      // Import and run playwright programmatically
      const { execSync } = require('child_process');
      
      let command = 'npx playwright test';
      if (testPattern) {
        command += ` ${testPattern}`;
      }
      if (!headless) {
        command += ' --headed';
      }

      const result = execSync(command, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe'
      });

      return {
        success: true,
        stdout: result,
        stderr: '',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        timestamp: new Date().toISOString()
      };
    }
  }

  async screenshot(params) {
    const { url, selector, filename } = params;
    
    if (!url) {
      throw new Error('URL is required for screenshot');
    }

    const script = `
      const { chromium } = require('@playwright/test');
      (async () => {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto('${url}');
        ${selector ? `await page.waitForSelector('${selector}');` : ''}
        await page.screenshot({ path: '${filename || 'screenshot.png'}' });
        await browser.close();
        console.log('Screenshot saved');
      })();
    `;

    return new Promise((resolve) => {
      const child = spawn('node', ['-e', script], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          filename: filename || 'screenshot.png',
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async open(params) {
    const { url } = params;
    
    if (!url) {
      throw new Error('URL is required for open');
    }

    const script = `
      const { chromium } = require('@playwright/test');
      (async () => {
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        await page.goto('${url}');
        console.log('Browser opened');
        // Keep browser open for 30 seconds
        await new Promise(resolve => setTimeout(resolve, 30000));
        await browser.close();
      })();
    `;

    return new Promise((resolve) => {
      const child = spawn('node', ['-e', script], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout,
          stderr,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async getTestResults() {
    const reportPath = path.join(process.cwd(), 'playwright-report', 'index.html');
    
    if (!fs.existsSync(reportPath)) {
      return {
        success: false,
        message: 'No test report found. Run tests first.',
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: true,
      reportPath,
      timestamp: new Date().toISOString()
    };
  }
}

// CLI Interface
if (require.main === module) {
  const server = new PlaywrightMCPServer();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Playwright MCP Server');
    console.log('Usage:');
    console.log('  mcp-playwright runTests [options]');
    console.log('  mcp-playwright screenshot --url <url> [--selector <selector>] [--filename <filename>]');
    console.log('  mcp-playwright open --url <url>');
    console.log('  mcp-playwright getTestResults');
    process.exit(0);
  }

  const command = args[0];
  const params = {};

  // Parse command line arguments
  for (let i = 1; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      params[key] = value;
    }
  }

  const request = { method: command, params };
  
  server.handleRequest(request).then(result => {
    console.log(JSON.stringify(result, null, 2));
  }).catch(error => {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  });
}

module.exports = PlaywrightMCPServer;
