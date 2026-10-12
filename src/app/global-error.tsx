'use client';

import { CrashScreen } from '@/components/layout/CrashScreen';

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <CrashScreen {...props} />
      </body>
    </html>
  );
}
