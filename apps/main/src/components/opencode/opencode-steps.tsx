'use client';

import type { ToolSummary } from '@/types/opencode';

interface OpencodeStepsProps {
  toolSteps: ToolSummary[];
  responseText: string;
  showDebug?: boolean;
}

function formatJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function ToolStep({ step }: { step: ToolSummary }) {
  const hasDetails = step.output !== undefined || !!step.error || step.raw.state?.input !== undefined;

  return (
    <details className="group rounded border bg-white/70 px-3 py-2 text-xs" open={!hasDetails}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 font-medium">
          <span className="text-muted-foreground">›</span>
          <span>{step.title}</span>
          {step.subtitle ? <span className="text-muted-foreground">· {step.subtitle}</span> : null}
        </div>
        <div className="uppercase text-[10px] text-muted-foreground">{step.status}</div>
      </summary>
      {hasDetails && (
        <div className="mt-2 space-y-2">
          {step.raw.state?.input !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Input</div>
              <pre className="whitespace-pre-wrap rounded border bg-white p-2 text-[11px]">
                {formatJson(step.raw.state?.input)}
              </pre>
            </div>
          )}
          {step.output !== undefined && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Output</div>
              <pre className="whitespace-pre-wrap rounded border bg-white p-2 text-[11px]">
                {formatJson(step.output)}
              </pre>
            </div>
          )}
          {step.error && (
            <div>
              <div className="text-[10px] uppercase text-red-600">Error</div>
              <pre className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-[11px] text-red-700">
                {step.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </details>
  );
}

export function OpencodeSteps({ toolSteps, responseText, showDebug = false }: OpencodeStepsProps) {
  if (!showDebug) {
    return null;
  }

  if (toolSteps.length === 0 && !responseText) {
    return (
      <div className="font-mono text-xs max-h-96 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-900">
        <div className="text-gray-400">Waiting for events...</div>
      </div>
    );
  }

  return (
    <div className="font-mono text-xs max-h-96 overflow-y-auto border rounded p-2 bg-gray-50 text-gray-900 space-y-4">
      {toolSteps.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">
            Steps · {toolSteps.length}
          </div>
          {toolSteps.map((step) => (
            <ToolStep key={step.callID} step={step} />
          ))}
        </div>
      )}

      {responseText && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Response</div>
          <div className="whitespace-pre-wrap rounded border bg-white/70 p-3 text-sm">{responseText}</div>
        </div>
      )}
    </div>
  );
}
