import { useRef, useState } from "react";
import { Loader2, Upload, Sparkles, Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { parseHealthImage, isGeminiConfigured, type ParsedMetric } from "@/lib/gemini";
import { addHealthMetric } from "@/lib/repository";
import { toDateKey } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  date: Date;
  onSaved: () => void;
}

type Stage = "idle" | "parsing" | "review";

/** 인바디/건강검진 이미지를 Gemini로 파싱 → 확인·편집 → 저장 (파일은 즉시 소멸) */
export function UploadSheet({ open, onOpenChange, userId, date, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [parsed, setParsed] = useState<ParsedMetric | null>(null);
  const [rows, setRows] = useState<{ key: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStage("idle");
    setParsed(null);
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setStage("parsing");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file); // 브라우저 내 Base64 변환 (스토리지 미사용)
      });
      const result = await parseHealthImage(base64, file.type);
      setParsed(result);
      setRows(Object.entries(result.data).map(([key, value]) => ({ key, value: String(value) })));
      setStage("review");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "이미지 분석에 실패했습니다.");
      setStage("idle");
    }
  };

  const updateRow = (i: number, field: "key" | "value", v: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)));

  const save = async () => {
    if (!parsed) return;
    setSaving(true);
    try {
      const data = Object.fromEntries(rows.filter((r) => r.key.trim()).map((r) => [r.key, r.value]));
      await addHealthMetric({
        user_id: userId,
        date: parsed.date ?? toDateKey(date),
        metric_type: parsed.metric_type,
        data,
      });
      toast.success("건강 데이터가 저장되었습니다.");
      reset();
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-highlight" /> 검진/인바디 AI 파싱
          </DrawerTitle>
          <DrawerDescription>
            결과지 이미지를 올리면 수치를 자동 추출합니다. 업로드 파일은 저장되지 않습니다.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-4 overflow-y-auto px-5 py-2">
          {!isGeminiConfigured && (
            <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              VITE_GEMINI_API_KEY 가 설정되지 않아 AI 파싱을 사용할 수 없습니다.
            </p>
          )}

          {stage === "idle" && (
            <button
              type="button"
              disabled={!isGeminiConfigured}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-12 text-muted-foreground hover:border-primary/50 disabled:opacity-40"
            >
              <Upload className="h-8 w-8" />
              <span className="text-sm">이미지 / 결과지 선택</span>
            </button>
          )}

          {stage === "parsing" && (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-highlight" />
              <span className="text-sm">AI가 수치를 읽고 있습니다…</span>
            </div>
          )}

          {stage === "review" && parsed && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                분류:{" "}
                <span className="font-semibold text-highlight">
                  {parsed.metric_type === "inbody" ? "인바디" : "건강검진"}
                </span>
                {parsed.date && ` · ${parsed.date}`}
              </p>
              <p className="text-xs text-muted-foreground">값을 확인하고 필요 시 수정하세요.</p>
              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={r.key}
                      onChange={(e) => updateRow(i, "key", e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      value={r.value}
                      onChange={(e) => updateRow(i, "value", e.target.value)}
                      className="w-28"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>

        <DrawerFooter>
          {stage === "review" ? (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={reset}>
                다시 선택
              </Button>
              <Button variant="highlight" className="flex-1" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                저장
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
