/**
 * swgoh.gg GAC 크롤러
 * - 5v5 최신 시즌 카운터 데이터
 * - 3v3 최신 시즌 카운터 데이터
 * 결과를 data/gac-5v5.json, data/gac-3v3.json 으로 저장
 */

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const CRAWL_TARGETS = [
  {
    key: "5v5",
    seasonNumber: 78,
    outputFile: "gac-5v5.json",
  },
  {
    key: "3v3",
    seasonNumber: 77,
    outputFile: "gac-3v3.json",
  },
];

// URL 생성 함수
function buildGACUrl(seasonNumber) {
  return `https://swgoh.gg/gac/counters/season/CHAMPIONSHIPS_GRAND_ARENA_GA2_EVENT_SEASON_${seasonNumber}/`;
}

// 사람처럼 보이기 위한 딜레이 헬퍼
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 800, max = 2000) =>
  sleep(Math.floor(Math.random() * (max - min) + min));

// 메인 페이지에서 모든 "Counters" 링크 추출
async function extractCounterLinks(page) {
  console.log("   → 캐릭터 Counters 링크 수집 중...");
  
  const links = await page.evaluate(() => {
    const results = [];
    
    const counterLinks = Array.from(document.querySelectorAll('a[href*="/gac/counters/"]'));
    
    counterLinks.forEach((link) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();
      
      if (!href || !text) return;
      if (href.includes('/season/')) return; // 시즌 페이지 자체 링크 제외

      const match = text.match(/(.+?)\s+Counters$/i);
      const characterName = match ? match[1].trim() : text;
      const normalizedHref = href.trim();

      if (!normalizedHref) return;
      if (!/counter/i.test(text)) return;

      results.push({
        character: characterName,
        href: normalizedHref,
        fullText: text,
      });
    });
    
    // 중복 링크 제거
    return results.filter((item, index, arr) =>
      index === arr.findIndex((other) => other.href === item.href)
    );
  });
  
  console.log(`   → 수집된 링크: ${links.length}개`);
  return links;
}

// 각 카운터 페이지에서 캐릭터별 승률 크롤링
async function crawlCharacterCounters(page, url, characterName) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForSelector('table tbody tr, .counter-row, .counter-item', { timeout: 10000 }).catch(() => null);
    await randomDelay(800, 1500);
    
    const counterData = await page.evaluate(() => {
      const results = [];
      const table = document.querySelector('table');

      if (table) {
        const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
          th.textContent?.trim().toLowerCase() || ''
        );
        const nameIndex = headers.findIndex((h) => /name|unit|character|defense/i.test(h));
        const winIndex = headers.findIndex((h) => /win|rate|hold|percent|%/i.test(h));
        const firstRows = Array.from(table.querySelectorAll('tbody tr'));

        firstRows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length < 2) return;

          const unitName = cells[nameIndex >= 0 ? nameIndex : 0]?.textContent?.trim() || '';
          const winRate = cells[winIndex >= 0 ? winIndex : 1]?.textContent?.trim() || '';
          if (unitName && winRate) {
            results.push({ unit: unitName, winRate });
          }
        });
      }

      if (results.length === 0) {
        const altRows = Array.from(document.querySelectorAll('.counter-row, .counter-item'));
        altRows.forEach((row) => {
          const text = row.textContent?.trim() || '';
          if (!text) return;
          const parts = text.split(/\s{2,}|\n/).map((part) => part.trim()).filter(Boolean);
          if (parts.length >= 2) {
            results.push({ unit: parts[0], winRate: parts[1] });
          }
        });
      }

      return results;
    });
    
    return {
      character: characterName,
      url: url,
      counters: counterData,
      success: true,
    };
  } catch (err) {
    console.warn(`   ⚠️ ${characterName} 크롤링 실패: ${err.message}`);
    return {
      character: characterName,
      url: url,
      counters: [],
      success: false,
      error: err.message,
    };
  }
}

async function crawlGAC(browser, target) {
  const seasonNumbers = [
    target.seasonNumber + 2,  // 시도 1: 최신 시즌 (+2)
    target.seasonNumber,      // 시도 2: 현재 시즌 (기존 번호)
    target.seasonNumber - 2,  // 시도 3: 이전 시즌 (-2)
  ];
  
  for (let attempt = 0; attempt < seasonNumbers.length; attempt++) {
    const currentSeasonNumber = seasonNumbers[attempt];
    const baseUrl = buildGACUrl(currentSeasonNumber);
    const seasonId = `CHAMPIONSHIPS_GRAND_ARENA_GA2_EVENT_SEASON_${currentSeasonNumber}`;
    
    console.log(`\n[${target.key}] 크롤링 시작 (시도 ${attempt + 1}/${seasonNumbers.length}): ${baseUrl}`);

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();

    try {
      // 1. 메인 시즌 페이지 방문
      await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 60000 });
      await randomDelay(1500, 3000);

      // 2. 페이지에서 시즌 정보 추출
      const seasonText = await page
        .locator(".gac-season-title, h1, .season-label")
        .first()
        .textContent()
        .catch(() => "Unknown Season");

      console.log(`[${target.key}] 시즌: ${seasonText?.trim()}`);

      // 3. 모든 "Counters" 링크 추출
      const counterLinks = await extractCounterLinks(page);
      
      if (counterLinks.length === 0) {
        throw new Error("No counter links found on the page");
      }

      // 4. 각 카운터 링크를 순회하면서 데이터 수집
      const allCounterData = [];
      
      for (let i = 0; i < counterLinks.length; i++) {
        const link = counterLinks[i];
        const fullUrl = link.href.startsWith('http')
          ? link.href
          : `https://swgoh.gg${link.href}`;
        
        const parsedUrl = new URL(fullUrl);
        parsedUrl.searchParams.set('season_id', seasonId);
        const urlWithSeasonId = parsedUrl.toString();
        
        console.log(`   [${i + 1}/${counterLinks.length}] ${link.character} 크롤링...`);
        
        const result = await crawlCharacterCounters(page, urlWithSeasonId, link.character);
        allCounterData.push(result);
        
        await randomDelay(600, 1200);
      }

      // 5. 최종 데이터 저장
      const output = {
        type: target.key,
        season: seasonText?.trim() || "",
        seasonId: seasonId,
        seasonNumber: currentSeasonNumber,
        totalCharacters: allCounterData.length,
        lastUpdated: new Date().toISOString(),
        crawledAt: new Date().toISOString(),
        data: allCounterData,
      };

      const outPath = path.join(DATA_DIR, target.outputFile);
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
      
      const successCount = allCounterData.filter(d => d.success).length;
      console.log(
        `[${target.key}] ✅ 저장 완료: ${outPath} (${successCount}/${allCounterData.length}개 캐릭터)`
      );

      await context.close();
      return output;
    } catch (err) {
      console.error(`[${target.key}] ❌ 크롤링 오류 (시즌 ${currentSeasonNumber}):`, err.message);
      await context.close();

      // 재시도할 경우 다음 시즌 번호로 시도
      if (attempt < seasonNumbers.length - 1) {
        console.log(`[${target.key}] 다음 시즌으로 재시도합니다...`);
        await randomDelay(2000, 4000);
      } else {
        // 최종 실패: 빈 구조로 저장
        console.error(`[${target.key}] ❌ 모든 시즌 시도 실패`);
        const fallback = {
          type: target.key,
          season: "",
          seasonId: "",
          seasonNumber: 0,
          totalCharacters: 0,
          lastUpdated: new Date().toISOString(),
          crawledAt: new Date().toISOString(),
          error: err.message,
          data: [],
        };
        fs.writeFileSync(
          path.join(DATA_DIR, target.outputFile),
          JSON.stringify(fallback, null, 2),
          "utf-8"
        );
        return fallback;
      }
    }
  }
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log("=== SWGOH GAC 크롤러 시작 ===");
  console.log(`시각: ${new Date().toISOString()}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  try {
    for (const target of CRAWL_TARGETS) {
      await crawlGAC(browser, target);
      await randomDelay(3000, 6000); // 타겟 간 딜레이
    }
    console.log("\n=== 크롤링 완료 ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
