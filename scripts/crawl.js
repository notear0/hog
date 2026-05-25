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

async function crawlGAC(browser, target) {
  const seasonNumbers = [
    target.seasonNumber + 2,  // 시도 1: 최신 시즌 (+2)
    target.seasonNumber,      // 시도 2: 현재 시즌 (기존 번호)
    target.seasonNumber - 2,  // 시도 3: 이전 시즌 (-2)
  ];
  
  for (let attempt = 0; attempt < seasonNumbers.length; attempt++) {
    const currentSeasonNumber = seasonNumbers[attempt];
    const url = buildGACUrl(currentSeasonNumber);
    console.log(`\n[${target.key}] 크롤링 시작 (시도 ${attempt + 1}/${seasonNumbers.length}): ${url}`);

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
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      await randomDelay(1500, 3000);

      // 시즌 정보 추출
      const seasonText = await page
        .locator(".gac-season-title, h1, .season-label")
        .first()
        .textContent()
        .catch(() => "Unknown Season");

      // 배틀 수 추출
      const battlesText = await page
        .locator("text=/\\d+(\\.\\d+)?[KM]? Battles/")
        .first()
        .textContent()
        .catch(() => "");

      console.log(`[${target.key}] 시즌: ${seasonText?.trim()}`);
      console.log(`[${target.key}] 배틀 수: ${battlesText?.trim()}`);

      // 카운터 테이블의 각 행 파싱
      // swgoh.gg 카운터 페이지: 방어팀 리더 → 카운터 팀 목록 구조
      const counters = await page.evaluate(() => {
        const results = [];

        // 방어팀 섹션들을 순회
        const defenseBlocks = document.querySelectorAll(
          ".counters-block, .counter-group, [class*='counter-row'], table tbody tr"
        );

        defenseBlocks.forEach((block, idx) => {
          if (idx > 49) return; // 상위 50개만

          // 방어 리더 이름
          const defLeaderEl =
            block.querySelector(".char-name, .unit-name, td:first-child a") ||
            block.querySelector("a");
          const defLeader = defLeaderEl?.textContent?.trim() || "";

          if (!defLeader) return;

          // 카운터 목록
          const counterItems = block.querySelectorAll(
            ".counter-item, .counter-squad, td:nth-child(2) .unit, td"
          );
          const counterList = [];
          counterItems.forEach((ci) => {
            const name = ci.textContent?.trim();
            if (name && name !== defLeader && name.length > 1) {
              counterList.push(name);
            }
          });

          // 승률 / Hold% 등
          const winRateEl = block.querySelector(
            ".win-rate, .hold-rate, [class*='rate'], td:nth-child(3)"
          );
          const winRate = winRateEl?.textContent?.trim() || "";

          // 전투 수
          const countEl = block.querySelector(
            ".battle-count, [class*='count'], td:nth-child(4)"
          );
          const battleCount = countEl?.textContent?.trim() || "";

          results.push({
            defense: defLeader,
            counters: counterList.slice(0, 5),
            winRate,
            battleCount,
          });
        });

        return results;
      });

      // 만약 위 선택자가 빈 배열이면, 페이지 전체 HTML 스냅샷 저장 후 분석용으로 활용
      let finalData = counters;
      if (counters.length === 0) {
        console.warn(
          `[${target.key}] 일반 선택자로 파싱 실패 — 대체 파싱 시도`
        );

        // 대체: 모든 링크와 숫자를 구조화해서 저장
        finalData = await page.evaluate(() => {
          const rows = [];
          // 테이블이 있는 경우
          document.querySelectorAll("table").forEach((table) => {
            const headers = [...table.querySelectorAll("thead th")].map((th) =>
              th.textContent.trim()
            );
            table.querySelectorAll("tbody tr").forEach((tr) => {
              const cells = [...tr.querySelectorAll("td")].map((td) =>
                td.textContent.trim()
              );
              if (cells.length > 0) {
                const obj = {};
                headers.forEach((h, i) => {
                  obj[h || `col${i}`] = cells[i] || "";
                });
                rows.push(obj);
              }
            });
          });
          return rows;
        });
      }

      // 마지막 업데이트 시각 추출
      const lastUpdated = await page
        .locator("text=/Last updated/i, text=/Updated/i")
        .first()
        .textContent()
        .catch(() => "");

      const output = {
        type: target.key,
        season: seasonText?.trim() || "",
        totalBattles: battlesText?.trim() || "",
        lastUpdated: lastUpdated?.trim() || new Date().toISOString(),
        crawledAt: new Date().toISOString(),
        counters: finalData,
      };

      const outPath = path.join(DATA_DIR, target.outputFile);
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
      console.log(
        `[${target.key}] ✅ 저장 완료: ${outPath} (${finalData.length}개 항목)`
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
          totalBattles: "",
          lastUpdated: new Date().toISOString(),
          crawledAt: new Date().toISOString(),
          error: err.message,
          counters: [],
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
