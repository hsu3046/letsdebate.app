import Image from 'next/image';
import type { CSSProperties } from 'react';
import { getProvider } from '@/lib/tournament';
import { getMascotTeam } from '@/lib/mascots';

export default function ModelAvatar({ id, small = false, large = false }: { id: string; small?: boolean; large?: boolean }) {
    const team = getMascotTeam(getProvider(id));
    return <span aria-hidden="true" style={team ? { background: team.background } as CSSProperties : undefined} className={`model-avatar ${team ? `mascot-avatar ${team.color}` : 'club-avatar'} ${small ? 'small' : ''} ${large ? 'large' : ''}`}>
        <Image src={team?.image || '/logo_light.svg'} width={160} height={160} sizes="160px" alt="" />
    </span>;
}
