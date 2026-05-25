# SWGOH META HUB 🌌

Star Wars: Galaxy of Heroes GAC 메타 분석 웹앱 + 자동 크롤러

---

## 📁 프로젝트 구조

```
swgoh-meta/
├── .github/
│   └── workflows/
│       ├── crawl.yml        ← 매일 자동 크롤링 (한국시간 오전 9시)
│       └── deploy.yml       ← GitHub Pages 자동 배포
├── data/
│   ├── gac-5v5.json         ← 크롤링된 5v5 데이터 (자동 생성)
│   └── gac-3v3.json         ← 크롤링된 3v3 데이터 (자동 생성)
├── scripts/
│   └── crawl.js             ← Playwright 크롤러
├── src/
│   ├── main.jsx
│   └── App.jsx              ← React 메인 앱
├── public/
│   └── manifest.json        ← PWA 설정
├── index.html
├── vite.config.js
└── package.json
```

---

## 🚀 설치 & 배포 (처음 한 번만)

### 1단계 — GitHub 저장소 생성

1. [github.com](https://github.com) 로그인
2. 우측 상단 `+` → **New repository**
3. 이름: `swgoh-meta` (또는 원하는 이름)
4. **Public** 선택 (GitHub Pages 무료 배포를 위해 필수)
5. **Create repository**

### 2단계 — 코드 업로드

```bash
# 로컬에서 실행 (Git 설치 필요)
git init
git add .
git commit -m "첫 커밋"
git branch -M main
git remote add origin https://github.com/본인아이디/swgoh-meta.git
git push -u origin main
```

### 3단계 — vite.config.js 수정

저장소 이름이 `swgoh-meta`이면 그대로 OK.
다른 이름으로 만들었다면 `vite.config.js`의 `base` 값 수정:
```js
base: "/저장소이름/",
```

### 4단계 — GitHub Pages 활성화

1. 저장소 → **Settings** → **Pages**
2. Source: **GitHub Actions** 선택
3. 저장

### 5단계 — 첫 크롤링 수동 실행

1. 저장소 → **Actions** 탭
2. 좌측 **SWGOH GAC 데이터 크롤링** 클릭
3. 우측 **Run workflow** → **Run workflow**
4. 완료되면 `data/` 폴더에 JSON 파일 자동 생성
5. 이후 `deploy.yml`이 자동으로 실행되어 사이트 배포

### 6단계 — PWA 설치 (안드로이드)

1. 크롬에서 `https://본인아이디.github.io/swgoh-meta/` 접속
2. 우측 상단 `⋮` 메뉴 → **홈 화면에 추가**
3. 완료! 앱 아이콘으로 설치됨

---

## ⏰ 자동 업데이트 주기

- 크롤러: **매일 오전 9시 (한국 시간)** 자동 실행
- Actions 탭에서 언제든 수동 실행 가능

---

## 🛠 로컬에서 개발하기

```bash
npm install
npm run crawl    # 크롤러 실행 (Node.js 필요)
npm run dev      # 개발 서버 시작 → http://localhost:5173
npm run build    # 프로덕션 빌드
```

---
