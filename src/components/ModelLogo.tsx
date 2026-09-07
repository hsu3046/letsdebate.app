import Image from 'next/image';
import { getPlayer } from '@/lib/players';

export default function ModelLogo({ id }: { id: string }) {
  const player = getPlayer(id);
  if (!player) return null;
  return <Image className="model-logo" src={player.logo} width={20} height={20} alt="" aria-hidden="true" />;
}
