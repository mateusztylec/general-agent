'use client';

import { useEffect, useState } from 'react';

interface OpencodeStepsProps {
  jobId: string;
}

export function OpencodeSteps({ jobId }: OpencodeStepsProps) {
  const [events, setEvents] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ jobId });
    const es = new EventSource(`/api/opencode/steps?${params.toString()}`);

    es.onmessage = (e) => {
      setEvents((prev) => [...prev, e.data]);
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [jobId]);

  return (
    <div className="font-mono text-xs max-h-96 overflow-y-auto border rounded p-2 bg-gray-50">
      {events.length === 0 ? (
        <div className="text-gray-400">Waiting for events...</div>
      ) : (
        events.map((event, i) => (
          <pre key={i} className="mb-1 whitespace-pre-wrap wrap-break-word">
            {event}
          </pre>
        ))
      )}
    </div>
  );
}
