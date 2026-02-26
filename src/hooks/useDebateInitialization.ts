import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApiKeyStore } from '@/store/apiKeyStore';
import { Topic, TeamAssignment, Participant, Character } from '@/lib/types';
import { getCharacterById } from '@/lib/characters';
import { RANDOM_TOPICS } from '@/lib/topics';
import { assignTeams } from '@/lib/teamAssignment';
import type { DebateStep } from '@/app/arena/page';
import { sortParticipantsByModelSpeed } from '@/lib/speakingOrder';

interface LoadingStage {
    step: number;
    text: string;
    progress: number;
}

interface UseDebateInitializationProps {
    participants: Participant[];
    topicTitle: string;
    humanParticipation: boolean;
    turnCount: number;
    debateType: 'vs' | 'roundtable';
    humanName: string;
}

interface UseDebateInitializationResult {
    isPreparing: boolean;
    loadingStage: LoadingStage;
    currentTopic: Topic | null;
    teamAssignments: TeamAssignment[];
    allSteps: DebateStep[];
    totalDebateTurns: number;
    directorStrategies: Record<string, any> | null;
    sortedParticipants: Participant[];
}

export function useDebateInitialization({
    participants,
    topicTitle,
    humanParticipation,
    turnCount,
    debateType,
    humanName
}: UseDebateInitializationProps): UseDebateInitializationResult {
    const router = useRouter();

    const [isPreparing, setIsPreparing] = useState(false);
    const [loadingStage, setLoadingStage] = useState<LoadingStage>({ step: 1, text: '', progress: 0 });
    const [currentTopic, setCurrentTopic] = useState<Topic | null>(null);
    const [teamAssignments, setTeamAssignments] = useState<TeamAssignment[]>([]);
    const [allSteps, setAllSteps] = useState<DebateStep[]>([]);
    const [totalDebateTurns, setTotalDebateTurns] = useState(0);
    const [sortedParticipants, setSortedParticipants] = useState<Participant[]>([]);

    const initializationRef = useRef(false);
    const directorStrategiesRef = useRef<Record<string, any> | null>(null);

    // BYOK: API 키 스토어에서 키 가져오기
    const getApiKeys = useApiKeyStore((state) => state.getApiKeys);

    useEffect(() => {
        if (participants.length === 0) {
            router.push('/participants');
            return;
        }

        if (initializationRef.current) return;
        initializationRef.current = true;

        const init = async () => {
            setIsPreparing(true);
            setLoadingStage({ step: 1, text: '', progress: 0 });
            const startTime = Date.now();

            const progressInterval = setInterval(() => {
                setLoadingStage(prev => {
                    if (prev.step >= 3 && prev.progress >= 100) {
                        clearInterval(progressInterval);
                        return prev;
                    }
                    if (prev.progress >= 99) return prev;
                    return { ...prev, progress: Math.min(prev.progress + 0.2, 99) };
                });
            }, 30);

            const sorted = sortParticipantsByModelSpeed(participants, (id) => getCharacterById(id));
            setSortedParticipants(sorted);

            const steps: DebateStep[] = [];

            // Opening
            sorted.forEach(p => {
                const idx = participants.findIndex(orig => orig.id === p.id);
                steps.push({ type: 'ai', phase: 'opening', participantIndex: idx });
            });
            if (humanParticipation) steps.push({ type: 'human', phase: 'opening' });

            // Debate Rounds
            let debateCounter = 0;
            while (debateCounter < turnCount) {
                for (let i = 0; i < participants.length && debateCounter < turnCount; i++) {
                    steps.push({ type: 'ai', phase: 'debate', participantIndex: -1 });
                    debateCounter++;
                }
                if (humanParticipation && debateCounter < turnCount) {
                    steps.push({ type: 'human', phase: 'debate' });
                    debateCounter++;
                }
            }
            setTotalDebateTurns(turnCount);

            // Closing
            for (let i = 0; i < sorted.length; i++) {
                steps.push({ type: 'ai', phase: 'closing', participantIndex: -2 });
            }
            if (humanParticipation) steps.push({ type: 'human', phase: 'closing' });

            setAllSteps(steps);

            // Topic Setup
            const foundTopic = RANDOM_TOPICS.find(t => t.title === topicTitle);
            const topic = foundTopic || {
                id: 0,
                type: 'OPEN_ENDED' as const,
                title: topicTitle,
                guideline: '자유롭게 의견을 나누세요.',
            };
            setCurrentTopic(topic);
            setLoadingStage(prev => ({ ...prev, step: 2 }));

            // Director API + Image Preload
            const aiNames = participants.filter(p => p.id !== 'human').map(p => p.name);

            const directorPromise = (async () => {
                try {
                    const res = await fetch('/api/director', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            topic: topicTitle,
                            participants: aiNames,
                            mode: debateType || '1v1',
                            apiKeys: getApiKeys(), // BYOK
                        }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        if (data.strategies) {
                            directorStrategiesRef.current = data.strategies;

                            const assignments = participants
                                .filter(p => p.id !== 'human')
                                .map(p => {
                                    const strat = data.strategies[p.name];
                                    const stanceRaw = strat?.role?.toUpperCase();
                                    const stance = ['PRO', 'CON', 'A', 'B'].includes(stanceRaw) ? stanceRaw : 'NONE';
                                    return {
                                        participantId: p.id,
                                        stance: stance as any,
                                        core_slogan: strat?.core_slogan,
                                    };
                                });
                            setTeamAssignments(assignments);
                            return;
                        }
                    }
                    console.warn('[Director] API failed, using fallback');
                    useFallbackAssignment(topic);
                } catch (e) {
                    console.error('[Director] Error:', e);
                    useFallbackAssignment(topic);
                }
            })();

            const imagePromise = (async () => {
                const urls = sorted.map(p => getCharacterById(p.id)?.avatarImage || '/avatars/avatar_chloe.jpeg');
                await Promise.all(urls.map(url => new Promise<void>(resolve => {
                    const img = new window.Image();
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = url;
                })));
            })();

            await Promise.all([directorPromise, imagePromise]);

            function useFallbackAssignment(t: Topic) {
                const aiIds = participants.filter(p => p.id !== 'human').map(p => p.id);
                const assignments = assignTeams(aiIds, t.type, humanParticipation);
                setTeamAssignments(assignments);
            }

            setLoadingStage(prev => ({ ...prev, step: 3 }));
            clearInterval(progressInterval);
            setLoadingStage(prev => ({ ...prev, step: 3, progress: 100 }));

            const elapsed = Date.now() - startTime;
            if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

            setIsPreparing(false);
        };

        init();
    }, [participants.length]);

    return {
        isPreparing,
        loadingStage,
        currentTopic,
        teamAssignments,
        allSteps,
        totalDebateTurns,
        directorStrategies: directorStrategiesRef.current,
        sortedParticipants
    };
}
