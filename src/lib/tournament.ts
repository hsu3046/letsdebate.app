export interface OpenRouterModel {
    id: string;
    name: string;
    contextLength: number;
    promptPrice: number;
    completionPrice: number;
}

export interface MatchMessage {
    id: string;
    side: 'a' | 'b';
    round: number;
    content: string;
}

export interface MatchVerdict {
    winner: 'a' | 'b';
    scores: { a: number; b: number };
    reason: string;
    highlights: { a: string; b: string };
}

export interface TournamentMatch {
    id: string;
    round: number;
    position: number;
    a: OpenRouterModel | null;
    b: OpenRouterModel | null;
    winnerId?: string;
    verdict?: MatchVerdict;
    status: 'pending' | 'running' | 'interrupted' | 'completed';
    messages: MatchMessage[];
    runId?: string;
    error?: string;
}

export interface Tournament {
    id: string;
    topic: string;
    context: string;
    entrants: OpenRouterModel[];
    judge: OpenRouterModel;
    turnsPerSide: 2 | 3;
    matches: TournamentMatch[];
    createdAt: number;
}

export function createBracket(entrants: OpenRouterModel[]): TournamentMatch[] {
    if (![4, 8].includes(entrants.length) || new Set(entrants.map(model => model.id)).size !== entrants.length) {
        throw new Error('서로 다른 4개 또는 8개의 모델을 선택해주세요.');
    }
    const matches: TournamentMatch[] = [];
    for (let round = 0; round < Math.log2(entrants.length); round++) {
        for (let position = 0; position < entrants.length / 2 ** (round + 1); position++) {
            matches.push({
                id: `r${round}-m${position}`, round, position,
                a: round === 0 ? entrants[position * 2] : null,
                b: round === 0 ? entrants[position * 2 + 1] : null,
                status: 'pending', messages: [],
            });
        }
    }
    return matches;
}

// Advancing is idempotent and tied to one run, so late stream events cannot change another match.
export function advanceWinner(tournament: Tournament, matchId: string, runId: string, verdict: MatchVerdict): Tournament {
    const match = tournament.matches.find(item => item.id === matchId);
    if (!match?.a || !match.b || match.status !== 'running' || match.runId !== runId) return tournament;
    const winner = match[verdict.winner];
    if (!winner) return tournament;
    return { ...tournament, matches: tournament.matches.map(item => {
        if (item.id === matchId) return { ...item, status: 'completed', winnerId: winner.id, verdict, error: undefined };
        if (item.round === match.round + 1 && item.position === Math.floor(match.position / 2)) {
            return { ...item, [match.position % 2 === 0 ? 'a' : 'b']: winner };
        }
        return item;
    }) };
}

export function getRoundName(round: number, size: number) {
    const remaining = size / 2 ** round;
    return remaining === 2 ? '결승' : remaining === 4 ? '준결승' : `${remaining}강`;
}

export function modelShortName(model: OpenRouterModel) {
    return model.name.replace(/^[^:]+:\s*/, '');
}

export function getProvider(modelId: string) { return modelId.split('/')[0]; }

export function tournamentMarkdown(tournament: Tournament): string {
    const lines = [`# ${tournament.topic}`, '', `생성: ${new Date(tournament.createdAt).toLocaleString('ko-KR')}`, `심판: ${tournament.judge.name}`, ''];
    for (const match of tournament.matches) {
        lines.push(`## ${getRoundName(match.round, tournament.entrants.length)} · 경기 ${match.position + 1}`, `${match.a?.name || '미정'} vs ${match.b?.name || '미정'}`, '');
        for (const message of match.messages) lines.push(`### ${match[message.side]?.name || message.side} · ${message.round}라운드`, message.content, '');
        if (match.verdict) lines.push(`**승자: ${match[match.verdict.winner]?.name}**`, `점수: ${match.verdict.scores.a} : ${match.verdict.scores.b}`, match.verdict.reason, '');
    }
    return lines.join('\n');
}

export function downloadText(content: string, filename: string) {
    const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
