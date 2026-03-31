"use client";

import { useMemo } from "react";

export default function LegacyPageFrame({ legacyFile }) {
  const src = useMemo(() => `/legacy/${legacyFile}`, [legacyFile]);

  return (
    <main className="legacy-shell">
      <iframe className="legacy-frame" src={src} title={legacyFile} />
    </main>
  );
}
