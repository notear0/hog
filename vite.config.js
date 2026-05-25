import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // GitHub Pages 배포 시 저장소 이름으로 base 경로 설정
  // 예: https://yourname.github.io/swgoh-meta/ 이면 base: "/swgoh-meta/"
  base: "/swgoh-meta/",
});
