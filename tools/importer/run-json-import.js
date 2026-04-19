#!/usr/bin/env node

/**
 * CLI Runner for JSON-based Content Import
 *
 * Command-line entry point that reads a URL list file and imports each page
 * using the json-importer module. Produces .plain.html content files in the
 * content/ directory and a JSON report of successes/failures.
 *
 * Usage: node tools/importer/run-json-import.js --urls <file-or-url>
 *   - File mode: reads URLs from a text file (one per line)
 *   - Single URL mode: imports a single URL directly
 *
 * Output:
 *   - content/<path>.plain.html — Imported page content
 *   - tools/importer/reports/json-import.report.json — Import report
 */
import { importPage } from './json-importer.js';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';

const CONTENT_DIR = 'content';

async function main() {
  // Parse CLI arguments: expects --urls followed by a file path or a single URL
  const args = process.argv.slice(2);
  const urlsIndex = args.indexOf('--urls');
  if (urlsIndex === -1 || !args[urlsIndex + 1]) {
    console.error('Usage: node run-json-import.js --urls <urls-file-or-url>');
    process.exit(1);
  }

  const urlsArg = args[urlsIndex + 1];
  let urls;

  // Determine input mode: file (read lines) or single URL (direct)
  if (existsSync(urlsArg)) {
    // File mode: read URLs from text file, skip blank lines and non-http entries
    urls = readFileSync(urlsArg, 'utf-8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && l.startsWith('http'));
  } else if (urlsArg.startsWith('http')) {
    // Single URL mode: import just one page
    urls = [urlsArg];
  } else {
    console.error(`URLs file not found: ${urlsArg}`);
    process.exit(1);
  }

  console.log(`[JSON Import] Starting import of ${urls.length} page(s)`);

  let success = 0;
  let failures = 0;
  const reports = [];

  // Process each URL sequentially (not parallelized to avoid overwhelming the source server)
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const label = `[${i + 1}/${urls.length}]`;

    try {
      console.log(`${label} Fetching ${url}`);
      // importPage() fetches .model.json, walks the component tree, and returns HTML
      const result = await importPage(url);

      if (result.error) {
        console.error(`${label} ERROR: ${result.error}`);
        failures++;
        reports.push({ url, status: 'error', error: result.error });
        continue;
      }

      // Write the imported content to content/<path>.plain.html
      const filePath = join(CONTENT_DIR, `${result.path}.plain.html`);
      const fileDir = dirname(filePath);
      mkdirSync(fileDir, { recursive: true });
      writeFileSync(filePath, result.html, 'utf-8');

      console.log(`${label} ✅ Saved to ${filePath}`);
      success++;
      reports.push({
        url,
        status: 'success',
        path: filePath,
        title: result.metadata?.Title || '',
      });
    } catch (err) {
      console.error(`${label} FATAL: ${err.message}`);
      failures++;
      reports.push({ url, status: 'error', error: err.message });
    }
  }

  console.log(`\n[JSON Import] Complete. Success: ${success}/${urls.length}, Failures: ${failures}`);

  // Write a JSON report summarizing all import results (useful for CI/CD and debugging)
  const reportPath = 'tools/importer/reports/json-import.report.json';
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(reports, null, 2), 'utf-8');
  console.log(`[Report] Saved to ${reportPath}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
