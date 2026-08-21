import { AlertTriangle, RefreshCw } from "lucide-react";

export function DataError({ message = "We could not load this data.", onRetry }: { message?: string; onRetry?: string }) {
  return <div className="data-error"><AlertTriangle size={20} /><div><strong>{message}</strong><p>Nothing was assumed or replaced with an empty state.</p>{onRetry && <a className="button button-outline button-small" href={onRetry}><RefreshCw size={14} /> Try again</a>}</div></div>;
}
