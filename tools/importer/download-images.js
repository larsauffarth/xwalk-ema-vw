#!/usr/bin/env node

/**
 * Downloads Scene7 images referenced in content HTML files
 * and rewrites src attributes to use local relative paths.
 *
 * Images are stored alongside content files using EDS media naming:
 *   content/de/media_<hash>.jpeg
 *
 * Usage: node tools/importer/download-images.js
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { createHash } from 'crypto';

const CONTENT_DIR = 'content';
const CONCURRENCY = 5;

/** Generate a deterministic filename from a URL */
function mediaFilename(url) {
  const hash = createHash('md5').update(url).digest('hex').substring(0, 16);
  return `media_${hash}.png`;
}

/** Collect all HTML files and their image URLs */
function collectImages() {
  const files = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.plain.html')) {
        const html = readFileSync(fullPath, 'utf-8');
        const matches = [...html.matchAll(/src="(https:\/\/assets\.volkswagen\.com\/is\/image\/[^"]+)"/g)];
        if (matches.length > 0) {
          files.push({
            path: fullPath,
            html,
            images: matches.map((m) => m[1]),
          });
        }
      }
    }
  }

  walk(CONTENT_DIR);
  return files;
}

/** Download a single image, returns local path or null on failure */
async function downloadImage(url, targetDir) {
  const filename = mediaFilename(url);
  const localPath = join(targetDir, filename);

  if (existsSync(localPath)) {
    return { url, localPath, filename, cached: true };
  }

  // Scene7 requires specific base64-encoded params to avoid 403
  // This param string = fit=crop,1&fmt=png&wid=800&align=0.00,0.00&bfc=off&c4b0
  const SCENE7_PARAMS = 'Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==';
  const fetchUrl = url.includes('?') ? url : `${url}?${SCENE7_PARAMS}`;

  try {
    const response = await fetch(fetchUrl, {
      headers: {
        referer: 'https://www.volkswagen.de/',
      },
    });

    if (!response.ok) {
      console.error(`  ❌ ${response.status} for ${url.substring(0, 80)}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(localPath, buffer);
    return { url, localPath, filename, cached: false, size: buffer.length };
  } catch (err) {
    console.error(`  ❌ Error: ${err.message} for ${url.substring(0, 80)}`);
    return null;
  }
}

/** Process images in batches */
async function downloadBatch(items, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((item) => downloadImage(item.url, item.targetDir)));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  console.log('[Image Download] Scanning content files...');
  const files = collectImages();

  // Collect all unique URLs with their target directories
  const urlMap = new Map(); // url -> { targetDir, filename }
  const downloadItems = [];

  for (const file of files) {
    const fileDir = dirname(file.path);
    for (const url of file.images) {
      if (!urlMap.has(url)) {
        const filename = mediaFilename(url);
        urlMap.set(url, { targetDir: fileDir, filename });
        downloadItems.push({ url, targetDir: fileDir });
      }
    }
  }

  console.log(`[Image Download] Found ${urlMap.size} unique images across ${files.length} content files`);
  console.log(`[Image Download] Downloading with concurrency ${CONCURRENCY}...`);

  // Download all images
  let downloaded = 0;
  let cached = 0;
  let failed = 0;

  for (let i = 0; i < downloadItems.length; i += CONCURRENCY) {
    const batch = downloadItems.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((item) => downloadImage(item.url, item.targetDir)),
    );

    for (const result of results) {
      if (!result) {
        failed++;
      } else if (result.cached) {
        cached++;
      } else {
        downloaded++;
      }
    }

    const total = downloaded + cached + failed;
    if (total % 10 === 0 || total === urlMap.size) {
      console.log(`  Progress: ${total}/${urlMap.size} (${downloaded} new, ${cached} cached, ${failed} failed)`);
    }
  }

  console.log(`\n[Image Download] Downloads complete: ${downloaded} new, ${cached} cached, ${failed} failed`);

  // Rewrite HTML files to use local paths
  console.log('[Image Rewrite] Updating content HTML files...');
  let rewriteCount = 0;

  for (const file of files) {
    let html = file.html;
    const fileDir = dirname(file.path);
    let changed = false;

    for (const url of file.images) {
      const info = urlMap.get(url);
      if (!info) continue;

      // Build relative path from the HTML file to the image
      const imagePath = join(info.targetDir, info.filename);
      let relPath = relative(fileDir, imagePath);
      if (!relPath.startsWith('.')) relPath = `./${relPath}`;

      // Replace the URL in HTML
      const newHtml = html.replaceAll(url, relPath);
      if (newHtml !== html) {
        html = newHtml;
        changed = true;
      }
    }

    if (changed) {
      writeFileSync(file.path, html);
      rewriteCount++;
    }
  }

  console.log(`[Image Rewrite] Updated ${rewriteCount} content files`);
  console.log(`\n[Complete] ${downloaded + cached} images available, ${rewriteCount} files rewritten`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
