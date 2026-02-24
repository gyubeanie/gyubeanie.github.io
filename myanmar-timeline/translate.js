/**
 * translate.js — Batch translate Korean article titles to English
 * Uses Google Translate's free web API endpoint
 * Run: node translate.js
 *
 * Reads data.json, adds titleEn to each article, writes back to data.json
 */

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, 'data.json');

async function translateText(text, from = 'ko', to = 'en') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const json = await res.json();
  // Response format: [[["translated text","original text",null,null,X],...]]
  let translated = '';
  if (json && json[0]) {
    for (const segment of json[0]) {
      if (segment[0]) translated += segment[0];
    }
  }
  return translated;
}

// Batch translate with rate limiting
async function translateBatch(titles, batchSize = 10, delayMs = 500) {
  const results = new Array(titles.length);
  let completed = 0;

  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize);
    const promises = batch.map(async (title, j) => {
      try {
        const translated = await translateText(title);
        results[i + j] = translated;
      } catch (err) {
        console.error(`  Error translating "${title.substring(0, 40)}...": ${err.message}`);
        results[i + j] = title; // Fallback to original
      }
    });

    await Promise.all(promises);
    completed += batch.length;

    if (completed % 50 === 0 || completed === titles.length) {
      console.log(`  Translated ${completed}/${titles.length} titles...`);
    }

    // Rate limit: wait between batches
    if (i + batchSize < titles.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  return results;
}

async function main() {
  console.log('Reading data.json...');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Collect all unique titles
  const allTitles = [];
  const titleMap = new Map(); // title -> index in allTitles

  for (const issue of data.issues) {
    for (const article of issue.articles) {
      if (!titleMap.has(article.title)) {
        titleMap.set(article.title, allTitles.length);
        allTitles.push(article.title);
      }
    }
  }

  console.log(`Found ${allTitles.length} unique titles to translate`);

  // Check if we have a cache file
  const cachePath = path.join(__dirname, 'translations_cache.json');
  let cache = {};
  if (fs.existsSync(cachePath)) {
    cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    console.log(`Loaded ${Object.keys(cache).length} cached translations`);
  }

  // Filter out already translated
  const toTranslate = allTitles.filter(t => !cache[t]);
  console.log(`Need to translate ${toTranslate.length} new titles`);

  if (toTranslate.length > 0) {
    console.log('Starting translation...');
    const translations = await translateBatch(toTranslate, 8, 600);

    // Update cache
    toTranslate.forEach((title, i) => {
      cache[title] = translations[i];
    });

    // Save cache
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
    console.log(`Saved translation cache (${Object.keys(cache).length} entries)`);
  }

  // Apply translations to data
  let applied = 0;
  for (const issue of data.issues) {
    for (const article of issue.articles) {
      if (cache[article.title]) {
        article.titleEn = cache[article.title];
        applied++;
      } else {
        article.titleEn = article.title; // Fallback
      }
    }
  }

  console.log(`Applied ${applied} translations to articles`);

  // Write updated data.json
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 0), 'utf8');
  console.log('Written updated data.json with English translations');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
