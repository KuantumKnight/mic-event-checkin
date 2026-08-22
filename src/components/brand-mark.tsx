export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand brand-compact" : "brand"}>
      <span className="brand-mark">
        <img src="/mic-logo.webp" alt="MIC" />
      </span>
      <span className="brand-copy">
        <strong>MIC</strong>
        {!compact && <small>EVENT CHECK-IN</small>}
      </span>
    </div>
  );
}
