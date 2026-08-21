import { Radio } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <span className="brand-mark" aria-hidden="true">
        <Radio size={16} strokeWidth={2.5} />
      </span>
      <span className="brand-copy">
        <strong>MIC</strong>
        {!compact && <small>DEVELOPMENT DEPARTMENT</small>}
      </span>
    </div>
  );
}
