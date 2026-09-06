'use client';

import { useEffect, useRef, useState } from 'react';
import { useTournamentStore } from '@/store/tournamentStore';
import { parseMatchEvent } from '@/lib/tournamentProtocol';
import type { MatchMessage, Tournament, TournamentMatch } from '@/lib/tournament';

export function useMatchRunner() {
    const activeRun = useRef<{ controller: AbortController; tournamentId: string; matchId: string; runId: string } | null>(null);
    const [liveMessage, setLiveMessage] = useState<MatchMessage | null>(null);
    const [judging, setJudging] = useState(false);
    const stop = () => {
        const run = activeRun.current;
        if (!run) return;
        run.controller.abort();
        useTournamentStore.getState().interruptMatch(run.tournamentId, run.matchId, run.runId, '경기를 중단했어요. 다시 시작하면 이 경기를 처음부터 진행해요.');
        activeRun.current = null;
        setLiveMessage(null); setJudging(false);
    };
    useEffect(() => () => {
        const run = activeRun.current;
        if (run) {
            run.controller.abort();
            useTournamentStore.getState().interruptMatch(run.tournamentId, run.matchId, run.runId, '다른 페이지로 이동해 경기가 중단됐어요. 완료된 발언은 보관돼요.');
        }
    }, []);

    const start = async (tournament: Tournament, match: TournamentMatch) => {
        if (activeRun.current || !match.a || !match.b) return;
        const controller = new AbortController();
        const runId = crypto.randomUUID();
        if (!useTournamentStore.getState().startMatch(tournament.id, match.id, runId)) return;
        activeRun.current = { controller, tournamentId: tournament.id, matchId: match.id, runId };
        setJudging(false); setLiveMessage(null);
        let completed = false;
        let current: MatchMessage | null = null;
        try {
            const response = await fetch('/api/tournament/match', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': runId }, signal: controller.signal,
                body: JSON.stringify({ topic: tournament.topic, context: tournament.context, a: match.a.id, b: match.b.id, judge: tournament.judge.id, turnsPerSide: tournament.turnsPerSide }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error || '경기를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.');
            }
            if (!response.body) throw new Error('경기에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    buffer += decoder.decode(value, { stream: !done });
                    let boundary: number;
                    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
                        const event = parseMatchEvent(buffer.slice(0, boundary));
                        buffer = buffer.slice(boundary + 2);
                        if (!event || controller.signal.aborted) continue;
                        if (event.type === 'error') throw new Error(event.message);
                        if (event.type === 'turn') { current = { ...event, content: '' }; setLiveMessage(current); }
                        if (event.type === 'delta' && current) { current = { ...current, content: current.content + event.text }; setLiveMessage(current); }
                        if (event.type === 'message') {
                            useTournamentStore.getState().appendMessage(tournament.id, match.id, runId, event);
                            current = null; setLiveMessage(null);
                        }
                        if (event.type === 'judging') setJudging(true);
                        if (event.type === 'verdict') {
                            useTournamentStore.getState().finishMatch(tournament.id, match.id, runId, event.verdict);
                            completed = true;
                        }
                    }
                    if (done) break;
                }
            } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
            if (!completed && !controller.signal.aborted) throw new Error('판정이 끝나기 전에 연결이 끊겼어요. 완료된 발언은 보관돼요.');
        } catch (error) {
            if (!controller.signal.aborted) useTournamentStore.getState().interruptMatch(tournament.id, match.id, runId, error instanceof Error ? error.message : '경기에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
        } finally {
            if (activeRun.current?.runId === runId) { activeRun.current = null; setJudging(false); setLiveMessage(null); }
        }
    };
    return { start, stop, liveMessage, judging };
}
