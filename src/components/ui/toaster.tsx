import { Toaster as Sonner } from "sonner";

/** 전역 토스트 (디자인 가이드: 동작 상태를 토스트로 명확히 전달) */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="dark"
      richColors
      toastOptions={{
        style: {
          background: "#161E2E",
          border: "1px solid #1F2937",
          color: "#F9FAFB",
          fontFamily: "Spoqa Han Sans Neo, sans-serif",
        },
      }}
    />
  );
}

export { toast } from "sonner";
