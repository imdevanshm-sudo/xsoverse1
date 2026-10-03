import { permanentRedirect } from 'next/navigation';
import { viewPath } from '@/lib/giftLinks';

/** Links sent before the sender/recipient split keep working. */
export default function LegacyGiftPage({ params }: { params: { id: string } }) {
  permanentRedirect(viewPath(params.id));
}
