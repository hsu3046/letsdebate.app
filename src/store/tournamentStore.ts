import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { advanceWinner, createBracket, type Tournament, type TournamentMatch, type MatchMessage, type MatchVerdict } from '@/lib/tournament';

interface TournamentStore {
    tournaments: Tournament[];
    activeId: string | null;
    createTournament: (config: Omit<Tournament, 'id' | 'createdAt' | 'matches'>) => string;
    setActive: (id: string) => void;
    remove: (id: string) => void;
    startMatch: (tournamentId: string, matchId: string, runId: string) => boolean;
    appendMessage: (tournamentId: string, matchId: string, runId: string, message: MatchMessage) => void;
    interruptMatch: (tournamentId: string, matchId: string, runId: string, error: string) => void;
    finishMatch: (tournamentId: string, matchId: string, runId: string, verdict: MatchVerdict) => void;
}

export const useTournamentStore = create<TournamentStore>()(persist((set, get) => ({
    tournaments: [], activeId: null,
    createTournament: (config) => {
        const id = crypto.randomUUID();
        const tournament: Tournament = { ...config, id, createdAt: Date.now(), matches: createBracket(config.entrants) };
        set(state => ({ tournaments: [tournament, ...state.tournaments], activeId: id }));
        return id;
    },
    setActive: (id) => { if (get().tournaments.some(item => item.id === id)) set({ activeId: id }); },
    remove: (id) => set(state => ({ tournaments: state.tournaments.filter(item => item.id !== id), activeId: state.activeId === id ? null : state.activeId })),
    startMatch: (tournamentId, matchId, runId) => {
        const tournament = get().tournaments.find(item => item.id === tournamentId);
        const match = tournament?.matches.find(item => item.id === matchId);
        if (!match?.a || !match.b || match.status === 'completed' || tournament?.matches.some(item => item.status === 'running')) return false;
        set(state => ({ tournaments: updateMatch(state.tournaments, tournamentId, matchId, () => ({ ...match, status: 'running', runId, messages: [], error: undefined })) }));
        return true;
    },
    appendMessage: (tournamentId, matchId, runId, message) => set(state => ({
        tournaments: updateMatch(state.tournaments, tournamentId, matchId, match => match.runId === runId && match.status === 'running'
            ? { ...match, messages: [...match.messages.filter(item => item.id !== message.id), message] } : match),
    })),
    interruptMatch: (tournamentId, matchId, runId, error) => set(state => ({
        tournaments: updateMatch(state.tournaments, tournamentId, matchId, match => match.runId === runId && match.status === 'running'
            ? { ...match, status: 'interrupted', error } : match),
    })),
    finishMatch: (tournamentId, matchId, runId, verdict) => set(state => ({
        tournaments: state.tournaments.map(tournament => tournament.id === tournamentId ? advanceWinner(tournament, matchId, runId, verdict) : tournament),
    })),
}), {
    name: 'walgawalbu-tournaments', version: 1,
    // An in-flight request cannot survive a reload. Keep the transcript, require an explicit restart.
    merge: (persisted, current) => {
        const saved = persisted as Partial<TournamentStore> | undefined;
        return { ...current, ...saved, tournaments: (saved?.tournaments || []).map(tournament => ({
            ...tournament, matches: tournament.matches.map(match => match.status === 'running'
                ? { ...match, status: 'interrupted' as const, error: '페이지가 닫혀 경기가 중단됐어요. 다시 시작할 수 있어요.' } : match),
        })) };
    },
}));

function updateMatch(tournaments: Tournament[], tournamentId: string, matchId: string, update: (match: TournamentMatch) => TournamentMatch) {
    return tournaments.map(tournament => tournament.id === tournamentId ? {
        ...tournament, matches: tournament.matches.map(match => match.id === matchId ? update(match) : match),
    } : tournament);
}
