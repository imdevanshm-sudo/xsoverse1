import { memo } from 'react';

/** Receipt / preview store header — wraps or scales so long names never truncate. */
export const StoreName = memo(function StoreName({
  name,
  className = '',
}: {
  name: string;
  className?: string;
}) {
  return <p className={`xso-store-name ${className}`.trim()}>{name}</p>;
});
