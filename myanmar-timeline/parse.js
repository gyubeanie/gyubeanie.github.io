const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const BASE_DIR = path.join(__dirname, '이슈분석 & 핫이슈');
const OUTPUT_PATH = path.join(__dirname, 'data.json');

// ==================== TAG & PEOPLE RULES (reused from previous version) ====================

const TAG_RULES = {
  coup: [/쿠데타/i, /쿠테타/i, /coup/i, /군부/i, /SAC/i, /민아웅\s*흘라잉/i, /민 아웅 흘라잉/i, /MAH/i, /비상사태/i, /군정/i, /군사/i, /총사령관/i, /USDP/i, /계엄/i],
  sanctions: [/제재/i, /sanct/i, /블랙리스트/i, /blacklist/i, /OFAC/i, /dirty\s*list/i, /FATF/i],
  economy: [/경제/i, /투자/i, /FDI/i, /무역/i, /수출/i, /수입/i, /환율/i, /세금/i, /관세/i, /GDP/i, /인플레이션/i, /은행/i, /CBM/i, /금융/i, /증권/i, /주식/i, /부동산/i, /산업단지/i, /MIC/i, /DICA/i, /RCEP/i],
  human_rights: [/인권/i, /사형/i, /난민/i, /시위/i, /탄압/i, /강제/i, /refugee/i, /protest/i, /로힝가/i, /Rohingya/i, /구속/i, /체포영장/i, /ICC/i, /사면/i],
  china: [/중국/i, /China/i, /왕이/i, /시진핑/i, /일대일로/i, /CITIC/i, /짜욱퓨/i, /Kyaukphyu/i, /위안화/i, /윈난/i, /Myitsone/i, /희토류/i],
  resistance: [/NUG/i, /PDF/i, /CRPH/i, /CDM/i, /저항/i, /반군부/i, /인민방위군/i, /국민통합정부/i, /봄혁명/i, /불매/i],
  ethnic_conflict: [/EAO/i, /KIA/i, /KNU/i, /\bAA\b/i, /TNLA/i, /MNDAA/i, /UWSA/i, /소수민족/i, /무장/i, /카친/i, /카렌/i, /라카인/i, /Arakan/i, /1027/i, /3BHA/i, /Kokang/i],
  energy: [/전력/i, /에너지/i, /발전소/i, /가스/i, /석유/i, /태양광/i, /수력/i, /LNG/i, /원자력/i, /원전/i, /Rosatom/i, /연료/i],
  international: [/아세안/i, /ASEAN/i, /미국/i, /일본/i, /인도(?!네시아)/i, /러시아/i, /\bEU\b/i, /\bUN\b/i, /유엔/i, /바이든/i, /트럼프/i, /G-?7/i, /NATO/i],
  aung_san_suu_kyi: [/수지/i, /Suu\s*Kyi/i, /아웅산/i]
};

const PEOPLE_RULES = [
  { name: 'Min Aung Hlaing', patterns: [/민\s*아웅\s*흘라잉/i, /\bMAH\b/, /총사령관/i, /SAC\s*의장/i] },
  { name: 'Aung San Suu Kyi', patterns: [/수지/i, /Suu\s*Kyi/i] },
  { name: 'NUG', patterns: [/\bNUG\b/, /국민통합정부/] },
  { name: 'ASEAN', patterns: [/아세안/i, /\bASEAN\b/i] },
  { name: 'China', patterns: [/중국/i, /왕이/i, /시진핑/i, /윈난/i] },
  { name: 'Russia', patterns: [/러시아/i, /Russia/i, /Rosatom/i, /푸틴/i] },
  { name: 'Japan', patterns: [/일본/i, /Japan/i, /JICA/i, /JETRO/i] },
  { name: 'USA', patterns: [/미국/i, /\bUSA\b/i, /바이든/i, /트럼프/i, /블링컨/i, /OFAC/i] }
];

function getTags(text) {
  const tags = [];
  for (const [tag, patterns] of Object.entries(TAG_RULES)) {
    for (const p of patterns) {
      if (p.test(text)) { tags.push(tag); break; }
    }
  }
  return tags;
}

function getPeople(text) {
  const people = [];
  for (const rule of PEOPLE_RULES) {
    for (const p of rule.patterns) {
      if (p.test(text)) { people.push(rule.name); break; }
    }
  }
  return people;
}

// ==================== ARTICLE HEADER DETECTION ====================

// Matches: ISSUE ANALYSIS, HOT ISSUE, H0T ISSUE, HOT REPORT, HOT Report, EDITOR'S CHOICE
const HEADER_PATTERN = /^(ISSUE\s*ANALYSIS|H0T\s*ISSUE|HOT\s*ISSUE|HOT\s*REPORT|HOT\s*Report|EDITOR['\u2019]S\s*CHOICE)/i;
const AUTHOR_PATTERN = /(MBRI\s*소장|김정희|우리회계법인)/i;

// ==================== SECTION HEADING DETECTION ====================

function isLikelySectionHeading(line, prevEmpty, nextEmpty) {
  // Section headings are typically:
  // - Short (under 80 chars)
  // - Followed and/or preceded by empty lines
  // - End without period/comma (not mid-sentence)
  // - Not a data reference line
  if (!line || line.length > 100) return false;
  if (line.length < 5) return false;
  if (!prevEmpty && !nextEmpty) return false;
  // Must not end with typical sentence endings (comma, period + more text)
  if (/[.]\s*$/.test(line) && line.length > 60) return false;
  // Skip lines that are just data references, page numbers etc.
  if (/^(자료원|출처|Source|참고|\d+$|•|\*)/i.test(line.trim())) return false;
  // Skip very short non-heading lines
  if (line.length < 8 && !/[가-힣]/.test(line)) return false;
  // Heading if surrounded by blanks and reasonably short
  if (prevEmpty && nextEmpty && line.length < 80) return true;
  return false;
}

// ==================== BODY TEXT FORMATTING ====================

function formatBody(rawText) {
  const lines = rawText.split('\n');
  const blocks = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const prevEmpty = i === 0 || lines[i - 1].trim() === '';
    const nextEmpty = i === lines.length - 1 || lines[i + 1].trim() === '';

    if (line === '') {
      // End current block
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', text: currentBlock.join(' ') });
        currentBlock = [];
      }
    } else if (isLikelySectionHeading(line, prevEmpty, nextEmpty)) {
      // Save any pending paragraph
      if (currentBlock.length > 0) {
        blocks.push({ type: 'paragraph', text: currentBlock.join(' ') });
        currentBlock = [];
      }
      blocks.push({ type: 'heading', text: line });
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push({ type: 'paragraph', text: currentBlock.join(' ') });
  }

  // Convert to simple markup: headings use [H] prefix, paragraphs separated by \n\n
  return blocks.map(b => {
    if (b.type === 'heading') return '[H]' + b.text;
    return b.text;
  }).join('\n\n');
}

// ==================== PARSE A SINGLE DOCX ====================

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = result.value;
  const lines = text.split('\n');

  // Find article boundaries: lines matching HEADER_PATTERN
  const headerIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (HEADER_PATTERN.test(lines[i].trim())) {
      // Skip duplicate headers (appear twice due to formatting)
      // If the previous header was within 5 lines, skip this one
      if (headerIndices.length > 0 && i - headerIndices[headerIndices.length - 1] < 5) continue;
      headerIndices.push(i);
    }
  }

  // If no headers found, treat entire document as one article
  if (headerIndices.length === 0) {
    // Try to find any article content
    const nonEmpty = lines.filter(l => l.trim().length > 10);
    if (nonEmpty.length < 3) return []; // Skip essentially empty docs
    headerIndices.push(0);
  }

  const articles = [];

  for (let h = 0; h < headerIndices.length; h++) {
    const startLine = headerIndices[h];
    const endLine = h < headerIndices.length - 1 ? headerIndices[h + 1] : lines.length;
    const section = lines.slice(startLine, endLine);

    // Determine article type from header
    const headerLine = section[0].trim();
    let type = 'analysis';
    let typeLabel = 'ISSUE ANALYSIS';
    if (/H0T\s*ISSUE|HOT\s*ISSUE/i.test(headerLine)) typeLabel = 'HOT ISSUE';
    if (/HOT\s*REPORT/i.test(headerLine)) typeLabel = 'HOT REPORT';
    if (/EDITOR/i.test(headerLine)) typeLabel = "EDITOR'S CHOICE";

    // Find title: first substantial non-empty line after header, before author line
    let title = '';
    let authorLineIdx = -1;
    let titleParts = [];

    for (let i = 1; i < section.length; i++) {
      const line = section[i].trim();
      if (!line) continue;

      // Check if this is the author line
      if (AUTHOR_PATTERN.test(line)) {
        authorLineIdx = i;
        break;
      }

      // Collect title parts (title might span multiple lines)
      // Skip the header type number (like "1" or "2" standalone)
      if (/^\d+$/.test(line)) continue;
      titleParts.push(line);
    }

    title = titleParts.join(' ').trim();
    if (!title) continue; // Skip articles without a title

    // Clean title: remove leading numbers, type prefixes
    title = title.replace(/^\d+\.\s*/, '').trim();

    // Extract body: everything after the author line
    let bodyLines = [];
    if (authorLineIdx >= 0) {
      // Skip author line and any empty lines after it
      let bodyStart = authorLineIdx + 1;
      while (bodyStart < section.length && section[bodyStart].trim() === '') bodyStart++;
      bodyLines = section.slice(bodyStart);
    }

    let body = formatBody(bodyLines.join('\n'));

    // Clean: remove author name from start of body
    body = body.replace(/^김정희\s*/, '').trim();

    // Skip TOC entries: articles with no body text or title with tab/page numbers
    if (!body || body.length < 50) continue;
    if (/\t\d+/.test(title)) continue; // Has tab + page number = TOC entry

    // Clean title: remove tab characters, page numbers, extra whitespace
    title = title.replace(/\t\d+\s*/g, ' ').replace(/\s+/g, ' ').trim();

    // Apply tag and people rules to title + first part of body for better classification
    const classificationText = title + ' ' + (body.substring(0, 500) || '');
    const tags = getTags(classificationText);
    const people = getPeople(classificationText);

    articles.push({
      title: typeLabel + ': ' + title,
      type,
      tags,
      people,
      isHighlight: true, // All analysis articles are highlights
      body
    });
  }

  return articles;
}

// ==================== ISSUE NUMBER MAPPING ====================

// Feb 2021 = issue 61. Monthly increment from there.
function getIssueNum(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  // Jan 2016 = issue 1. Each month +1.
  // So Feb 2021 = (2021-2016)*12 + (2-1) + 1 = 5*12 + 2 = 62... let me verify:
  // Actually from the original data: Feb 2021 = issue 61 (통권61호)
  // Jan 2016 = issue 1, so Feb 2016 = 2, ... Jan 2021 = 61? No, let me calculate:
  // Jan 2016 = 1, Dec 2020 = 60 (5 years * 12), Jan 2021 = 61, Feb 2021 = 62
  // Wait, the original data says Feb 2021 is 통권61호. Let me just use:
  // Months from Jan 2016: (y-2016)*12 + m = issueNum
  return (y - 2016) * 12 + m;
}

// ==================== MAIN ====================

async function main() {
  const yearFolders = fs.readdirSync(BASE_DIR)
    .filter(f => fs.statSync(path.join(BASE_DIR, f)).isDirectory())
    .sort();

  console.log(`Found ${yearFolders.length} year folders: ${yearFolders.join(', ')}`);

  const allIssues = [];
  let totalArticles = 0;

  for (const yearFolder of yearFolders) {
    const yearPath = path.join(BASE_DIR, yearFolder);
    const docxFiles = fs.readdirSync(yearPath)
      .filter(f => f.endsWith('.docx') && !f.startsWith('~'))
      .sort((a, b) => {
        // Sort by month number
        const mA = parseInt(a.match(/(\d+)월/)?.[1] || '0');
        const mB = parseInt(b.match(/(\d+)월/)?.[1] || '0');
        return mA - mB;
      });

    for (const docxFile of docxFiles) {
      const filePath = path.join(yearPath, docxFile);

      // Extract date from filename: "2021년 2월호.docx" → "2021-02"
      const fileMatch = docxFile.match(/(\d{4})년\s*(\d{1,2})월호/);
      if (!fileMatch) {
        console.warn(`Skipping unrecognized filename: ${docxFile}`);
        continue;
      }
      const year = fileMatch[1];
      const month = fileMatch[2].padStart(2, '0');
      const dateStr = `${year}-${month}`;
      const issueNum = getIssueNum(dateStr);

      console.log(`Processing: ${docxFile} → ${dateStr} (issue ${issueNum})`);

      try {
        const articles = await parseDocx(filePath);

        if (articles.length === 0) {
          console.warn(`  No articles found in ${docxFile}`);
          continue;
        }

        // Assign IDs
        articles.forEach((a, idx) => {
          a.id = `${issueNum}-${idx}`;
        });

        allIssues.push({
          date: dateStr,
          label: `${year}년 ${parseInt(month)}월호`,
          issueNum,
          articles
        });

        totalArticles += articles.length;
        console.log(`  → ${articles.length} article(s): ${articles.map(a => a.title.substring(0, 50)).join(' | ')}`);
      } catch (e) {
        console.error(`  ERROR parsing ${docxFile}: ${e.message}`);
      }
    }
  }

  // Sort by date
  allIssues.sort((a, b) => a.date.localeCompare(b.date));

  // Stats
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Total: ${allIssues.length} issues, ${totalArticles} articles`);

  const tagCounts = {};
  allIssues.forEach(issue => {
    issue.articles.forEach(a => {
      (a.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    });
  });
  console.log('Tag distribution:', tagCounts);

  // Write output
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ issues: allIssues }, null, 0), 'utf8');
  console.log(`Written to ${OUTPUT_PATH}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);
}

main().catch(e => console.error('Fatal:', e));
