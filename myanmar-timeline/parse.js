const fs = require('fs');
const path = require('path');

const inputPath = path.join('C:', 'Users', 'gyubi', 'Downloads', 'docx_output.txt');
const outputPath = path.join('C:', 'Users', 'gyubi', 'OneDrive', 'Desktop', 'Github pages', 'gyubeanie.github.io', 'myanmar-timeline', 'data.json');

const text = fs.readFileSync(inputPath, 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Tag rules
const TAG_RULES = {
  coup: [/쿠데타/i, /쿠테타/i, /coup/i, /군부/i, /SAC/i, /민아웅\s*흘라잉/i, /민 아웅 흘라잉/i, /MAH/i, /비상사태/i, /군정/i, /군사/i, /총사령관/i, /USDP/i, /계엄/i],
  sanctions: [/제재/i, /sanct/i, /블랙리스트/i, /blacklist/i, /OFAC/i, /dirty\s*list/i, /제재조치/i],
  economy: [/경제/i, /투자/i, /FDI/i, /무역/i, /수출/i, /수입/i, /환율/i, /세금/i, /관세/i, /GDP/i, /인플레이션/i, /은행/i, /CBM/i, /금융/i, /증권/i, /주식/i, /부동산/i, /산업단지/i, /MIC/i, /DICA/i],
  human_rights: [/인권/i, /사형/i, /난민/i, /시위/i, /탄압/i, /강제/i, /refugee/i, /protest/i, /로힝가/i, /Rohingya/i, /구속/i, /체포영장/i, /ICC/i, /사면/i],
  china: [/중국/i, /China/i, /왕이/i, /시진핑/i, /일대일로/i, /CITIC/i, /짜욱퓨/i, /Kyaukphyu/i, /위안화/i, /중앙은행.*위안/i, /윈난/i, /Myitsone/i, /희토류/i],
  resistance: [/NUG/i, /PDF/i, /CRPH/i, /CDM/i, /저항/i, /반군부/i, /인민방위군/i, /국민통합정부/i, /봄혁명/i, /불매/i],
  ethnic_conflict: [/EAO/i, /KIA/i, /KNU/i, /\bAA\b/i, /TNLA/i, /MNDAA/i, /UWSA/i, /소수민족/i, /무장/i, /카친/i, /카렌/i, /라카인/i, /Arakan/i, /1027/i, /3BHA/i, /Kokang/i],
  energy: [/전력/i, /에너지/i, /발전소/i, /가스/i, /석유/i, /태양광/i, /수력/i, /LNG/i, /원자력/i, /원전/i, /Rosatom/i, /연료/i],
  international: [/아세안/i, /ASEAN/i, /미국/i, /일본/i, /인도(?!네시아)/i, /러시아/i, /\bEU\b/i, /\bUN\b/i, /유엔/i, /바이든/i, /트럼프/i, /G-?7/i, /NATO/i],
  aung_san_suu_kyi: [/수지/i, /Suu\s*Kyi/i, /아웅산/i]
};

// People rules
const PEOPLE_RULES = [
  { name: 'Min Aung Hlaing', patterns: [/민\s*아웅\s*흘라잉/i, /\bMAH\b/, /총사령관/i, /SAC\s*의장/i, /SAC의장/i] },
  { name: 'Aung San Suu Kyi', patterns: [/수지/i, /Suu\s*Kyi/i] },
  { name: 'NUG', patterns: [/\bNUG\b/, /국민통합정부/] },
  { name: 'ASEAN', patterns: [/아세안/i, /\bASEAN\b/i] },
  { name: 'China', patterns: [/중국/i, /왕이/i, /시진핑/i, /윈난/i] },
  { name: 'Russia', patterns: [/러시아/i, /Russia/i, /Rosatom/i, /푸틴/i] },
  { name: 'Japan', patterns: [/일본/i, /Japan/i, /JICA/i, /JETRO/i] },
  { name: 'USA', patterns: [/미국/i, /\bUSA\b/i, /바이든/i, /트럼프/i, /블링컨/i, /OFAC/i] }
];

function getTags(title) {
  const tags = [];
  for (const [tag, patterns] of Object.entries(TAG_RULES)) {
    for (const p of patterns) {
      if (p.test(title)) { tags.push(tag); break; }
    }
  }
  return tags;
}

function getPeople(title) {
  const people = [];
  for (const rule of PEOPLE_RULES) {
    for (const p of rule.patterns) {
      if (p.test(title)) { people.push(rule.name); break; }
    }
  }
  return people;
}

// Parse issue headers
// Pattern: "2021년 2월호(통권61호) 목차" or "2023년 2월호(통권 84호)"
const issuePattern = /^(\d{4})년\s*(\d{1,2})월호\s*\(통권\s*(\d+)호\)\s*목차?$/;
const issuePattern2 = /^(\d{4})년\s*(\d{1,2})월호\s*\(통권\s*(\d+)호\)$/;
// Special case: "2016년 1월호(창간호) 목차"
const issuePatternInaugural = /^(\d{4})년\s*(\d{1,2})월호\s*\(창간호\)\s*목차?$/;

const issues = [];
let currentIssue = null;
let articleIdx = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  let match = line.match(issuePattern) || line.match(issuePattern2) || line.match(issuePatternInaugural);
  if (match) {
    // For inaugural issue, set issueNum to 1
    if (!match[3]) match[3] = '1';
    if (currentIssue) issues.push(currentIssue);
    const year = match[1];
    const month = match[2].padStart(2, '0');
    const issueNum = parseInt(match[3]);
    currentIssue = {
      date: `${year}-${month}`,
      label: `${year}년 ${match[2]}월호`,
      issueNum,
      articles: []
    };
    articleIdx = 0;
    continue;
  }

  if (!currentIssue) continue;

  // Skip empty or pure whitespace
  if (!line.trim()) continue;

  // Determine article type
  const isAnalysis = /^(ISSUE ANALYSIS|HOT ISSUE|HOT REPORT|HOT Report|EDITOR'S CHOICE|MEMO:|주요 경제|주목할 만한|Update|Latest|별첨|ISSUE Check)/i.test(line);
  const isNumbered = /^\d+\.\s*/.test(line);

  // Skip lines that are just section markers or stats references
  if (/^(주요 경제 외교 뉴스|경제통계|주목할 만한 경제 통계|별첨|Update 경제통계|Latest statistics)$/i.test(line)) continue;

  if (isAnalysis || isNumbered) {
    const tags = getTags(line);
    const people = getPeople(line);

    // Determine highlight status
    let isHighlight = isAnalysis;
    // Also highlight important coup/sanctions/resistance articles
    if (tags.includes('coup') && (tags.includes('sanctions') || tags.includes('human_rights'))) isHighlight = true;
    // Key events
    const highlightKeywords = [/쿠데타/i, /쿠테타/i, /비상사태/i, /사형/i, /체포영장/i, /총선/i, /NUG.*선포/i, /1027/i, /계엄/i, /ICC/i, /아세안.*특별/i];
    for (const kw of highlightKeywords) {
      if (kw.test(line)) { isHighlight = true; break; }
    }

    currentIssue.articles.push({
      id: `${currentIssue.issueNum}-${articleIdx}`,
      title: line,
      type: isAnalysis ? 'analysis' : 'news',
      tags,
      people,
      isHighlight
    });
    articleIdx++;
  }
}

if (currentIssue) issues.push(currentIssue);

// ========== FILTER: Focus on coup era (Feb 2021+) with key pre-coup highlights ==========

const COUP_CUTOFF = '2021-02';

// Post-coup: everything from Feb 2021 onwards
const postCoup = issues.filter(i => i.date >= COUP_CUTOFF);

// Pre-coup: cherry-pick only the most important highlight articles
// Include select issues with key background context
const preCoupHighlights = [];
const preCoupIssues = issues.filter(i => i.date < COUP_CUTOFF);

for (const issue of preCoupIssues) {
  const keyArticles = issue.articles.filter(a => {
    // Only keep articles that are highlights AND relate to critical pre-coup themes
    if (!a.isHighlight) return false;
    // Key pre-coup themes: elections, Suu Kyi, military tensions, democratic transition
    const criticalTags = ['coup', 'human_rights', 'aung_san_suu_kyi', 'ethnic_conflict'];
    const hasCriticalTag = a.tags.some(t => criticalTags.includes(t));
    // Also keep articles with key pre-coup keywords
    const preCoupKeywords = [/총선/i, /선거/i, /NLD/i, /민주/i, /헌법/i, /로힝가/i, /Rohingya/i, /수지/i, /Suu Kyi/i, /군부/i, /ICJ/i];
    const hasKeyword = preCoupKeywords.some(kw => kw.test(a.title));
    return hasCriticalTag || hasKeyword;
  });

  if (keyArticles.length > 0) {
    preCoupHighlights.push({
      ...issue,
      articles: keyArticles,
      isBackground: true // Flag for UI styling
    });
  }
}

// ========== RELEVANCE FILTER: Keep only coup/crisis-relevant articles ==========
// Drop routine business, agriculture, construction, sports, tourism articles
// that aren't related to the coup, political crisis, or crisis economy

const IRRELEVANT_PATTERNS = [
  // Routine business/development unrelated to crisis
  /농업/i,           // agriculture
  /기공식/i,         // groundbreaking ceremony
  /착공식/i,         // construction ceremony
  /준공식/i,         // completion ceremony
  /관광/i,           // tourism (unless crisis context)
  /스포츠/i,         // sports
  /축구/i,           // football
  /골프/i,           // golf
  /문화행사/i,       // cultural events
  /맥주/i,           // beer
  /부동산.*분양/i,   // real estate sales
  /아파트.*분양/i,   // apartment sales
  /호텔.*개관/i,     // hotel opening
  /호텔.*오픈/i,     // hotel opening
  /쇼핑몰/i,         // shopping mall
  /패션/i,           // fashion
  /뷰티/i,           // beauty
  /한류/i,           // Korean wave/culture
  /K-pop/i,          // K-pop
  /드라마/i,         // drama
  /영화제/i,         // film festival
  /요리/i,           // cooking
  /레시피/i,         // recipe
  /결혼/i,           // marriage/wedding
  /CNG 생산/i,       // CNG production
  /제철소.*재가동/i, // steel mill restart
  /시멘트/i,         // cement
  /비료/i,           // fertilizer
];

// Crisis-relevant keywords that KEEP an article even if untagged
const CRISIS_RELEVANT = [
  /정변/i, /쿠데타/i, /쿠테타/i, /군부/i, /군정/i, /군사/i,
  /시위/i, /시민불복종/i, /CDM/i, /탄압/i, /체포/i, /구금/i, /사형/i,
  /NLD/i, /NUG/i, /PDF/i, /CRPH/i, /저항/i,
  /제재/i, /sanct/i, /OFAC/i,
  /위기/i, /붕괴/i, /급락/i, /폭락/i, /인플레/i, /물가.*상승/i, /통화.*하락/i,
  /현금.*부족/i, /은행.*제한/i, /송금.*제한/i, /화폐/i, /달러.*부족/i,
  /중단/i, /철수/i, /매각/i, /폐쇄/i, /사업.*중단/i, /투자.*중단/i,
  /원조.*중단/i, /지원.*중단/i, /차관.*중단/i,
  /난민/i, /피난/i, /실향민/i, /내전/i,
  /로힝가/i, /Rohingya/i,
  /인권/i, /ICC/i, /ICJ/i,
  /아세안/i, /ASEAN/i, /유엔/i, /\bUN\b/i,
  /미국/i, /중국/i, /일본/i, /러시아/i, /인도(?!네시아)/i,
  /바이든/i, /트럼프/i, /블링컨/i,
  /수지/i, /Suu\s*Kyi/i, /민\s*아웅/i, /총사령관/i,
  /EAO/i, /KIA/i, /KNU/i, /\bAA\b/i, /TNLA/i, /MNDAA/i, /1027/i, /3BHA/i,
  /계엄/i, /비상사태/i, /총선/i, /선거/i, /헌법/i,
  /코로나/i, /COVID/i, /산소.*부족/i, /의료/i,
  /전력.*부족/i, /정전/i, /전력.*위기/i,
  /월드뱅크/i, /World\s*Bank/i, /IMF/i, /ADB/i,
  /텔레노/i, /Telenor/i,
  /Fitch/i, /ILO/i, /Moody/i,
  /회계연도/i, /예산/i,
  /연방/i, /UEC/i,
  /폭력/i, /사망/i, /추락/i, /공습/i, /폭격/i, /전투/i,
  /대사/i, /외교/i, /정상회담/i,
  /로펌/i, /법적/i,
  /불법/i, /밀수/i, /마약/i,
];

function isCrisisRelevant(article) {
  const title = article.title;

  // If it has any crisis-related tag, keep it
  const crisisTags = ['coup', 'sanctions', 'human_rights', 'resistance', 'ethnic_conflict',
                       'international', 'aung_san_suu_kyi', 'china'];
  if (article.tags.some(t => crisisTags.includes(t))) return true;

  // If it has people tags, keep it (mentions key political figures)
  if (article.people && article.people.length > 0) return true;

  // If it's a highlight/analysis, keep it (editorial judgment)
  if (article.isHighlight) return true;

  // Check against irrelevant patterns — drop if matches
  for (const pat of IRRELEVANT_PATTERNS) {
    if (pat.test(title)) return false;
  }

  // Check against crisis-relevant keywords — keep if matches
  for (const pat of CRISIS_RELEVANT) {
    if (pat.test(title)) return true;
  }

  // Economy-tagged articles: keep only if they have crisis keywords
  if (article.tags.includes('economy')) {
    // Economy articles are kept by default since the crisis heavily impacts the economy
    return true;
  }

  // Energy-tagged: keep (energy crisis is part of the story)
  if (article.tags.includes('energy')) return true;

  // Untagged and no crisis keywords — drop
  return false;
}

// Apply relevance filter to post-coup issues
const filteredPostCoup = postCoup.map(issue => {
  const relevantArticles = issue.articles.filter(a => isCrisisRelevant(a));
  return { ...issue, articles: relevantArticles };
}).filter(issue => issue.articles.length > 0);

console.log(`Post-coup: ${postCoup.reduce((s,i) => s + i.articles.length, 0)} -> ${filteredPostCoup.reduce((s,i) => s + i.articles.length, 0)} after relevance filter`);

// Combine: pre-coup highlights + filtered post-coup
const finalIssues = [...preCoupHighlights, ...filteredPostCoup];

// Output stats
let totalArticles = 0;
finalIssues.forEach(i => totalArticles += i.articles.length);
console.log(`Parsed ${finalIssues.length} issues (${preCoupHighlights.length} background + ${postCoup.length} post-coup) with ${totalArticles} total articles`);

// Tag distribution
const tagCounts = {};
finalIssues.forEach(issue => {
  issue.articles.forEach(a => {
    (a.tags || []).forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  });
});
console.log('Tag distribution:', tagCounts);
console.log(`Pre-coup highlights: ${preCoupHighlights.reduce((s,i) => s + i.articles.length, 0)} articles from ${preCoupHighlights.length} issues`);

// Write output
fs.writeFileSync(outputPath, JSON.stringify({ issues: finalIssues }, null, 0), 'utf8');
console.log(`Written to ${outputPath}`);
