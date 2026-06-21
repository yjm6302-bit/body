/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Spoqa Han Sans Neo", "system-ui", "sans-serif"],
      },
      colors: {
        // 기획 디자인 시스템 팔레트 (프리미엄 다크 테마)
        background: "#0B0F19", // 메인 뷰포트 배경 (슬레이트 블랙)
        surface: "#161E2E", // 카드 배경
        // card = surface 별칭 (컴포넌트에서 bg-card / text-card-foreground 사용)
        card: "#161E2E",
        "card-foreground": "#F9FAFB",
        // 의미 기반 토큰
        border: "#1F2937",
        input: "#1F2937",
        ring: "#10B981",
        foreground: "#F9FAFB", // 텍스트 1 (Primary)
        muted: {
          DEFAULT: "#1F2937",
          foreground: "#9CA3AF", // 텍스트 2 (Secondary)
        },
        // 포인트 컬러
        exercise: "#10B981", // 포인트1 운동 (에메랄드 그린)
        trust: "#3B82F6", // 포인트2 수분·수면 (오션 블루)
        highlight: "#F59E0B", // 포인트3 영양 (비타민 앰버)
        danger: "#EF4444", // 서브 컬러 (로즈 레드)
        primary: {
          DEFAULT: "#10B981",
          foreground: "#0B0F19",
        },
      },
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
