
'use client';

import { useState, useCallback } from 'react';
import { useApiKeyStore } from '@/store/apiKeyStore';
import type { Participant, DebateMessage, InteractionMeta, Topic, Stance } from '@/lib/types';

interface UseDebateAIOptions {
    topic: string;
    topicData?: Topic;
    context?: string;
    participants: Participant[];
    teamAssignments?: { participantId: string; stance: Stance }[];
    humanName?: string;
    debateMode?: 'vs' | 'roundtable';
}

interface GenerateOptions {
    type: 'opening' | 'debate' | 'closing';
    participant: Participant;
    previousMessages?: { author: string; content: string }[];
    turnNumber?: number;
    openingSummary?: string;
    directorStrategy?: {
        role: string;
        stance: string;
        angle: string;
        win_condition: string;
    };
    turnInfo?: {
        current: number;
        total: number;
    };
}

interface GenerateResult {
    content: string;
    interaction?: InteractionMeta;
}

interface CoachData {
    target_weakness: string;
    tactical_instruction: string;
    forbidden_keywords?: string[];
}


// 일본어 문자 필터링
const filterJapanese = (text: string): string => {
    return text.replace(/[\u3040-\u309F\u30A0-\u30FF]/g, '');
};

// 메타 텍스트 필터링
const filterMetaText = (text: string): string => {
    return text
        .replace(/\[발언 규칙\][\s\S]*?(?=\n\n|$)/g, '')
        .replace(/\[작성 규칙\][\s\S]*?(?=\n\n|$)/g, '')
        .replace(/\[[가-힣]+\]:\s*/g, '')
        .replace(/\*\*[^*]+\*\*:\s*/g, '')
        .replace(/^\d+\.\s*\*\*[^*]+\*\*:.*$/gm, '')
        .replace(/\(중립적\)/g, '')
        .replace(/\(결론\)/g, '')
        .replace(/\n{2,}/g, '\n')
        .trim();
};

// 통합 필터
const cleanAIResponse = (text: string): string => {
    let cleaned = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

    const incompleteThinkingStart = cleaned.indexOf('<thinking>');
    if (incompleteThinkingStart !== -1) {
        cleaned = cleaned.substring(0, incompleteThinkingStart);
    }

    cleaned = cleaned.replace(/<(?:t(?:h(?:i(?:n(?:k(?:i(?:n(?:g)?)?)?)?)?)?)?)?$/gi, '');

    return filterMetaText(filterJapanese(cleaned));
};

export function useDebateAI({ topic, topicData, context, participants, teamAssignments, debateMode }: UseDebateAIOptions) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [streamingText, setStreamingText] = useState('');

    // BYOK: API 키 스토어에서 키 가져오기
    const getApiKeys = useApiKeyStore((state) => state.getApiKeys);

    // Coach API 호출
    const fetchCoachInstruction = async (
        playerModel: string,
        playerRole: string,
        opponentModel: string,
        historySummary: string,
        phase: 'opening' | 'debate' | 'closing',
        mode: 'vs' | 'roundtable',
        turnInfo?: { current: number; total: number }
    ): Promise<CoachData | null> => {
        try {
            const response = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerModel,
                    playerRole,
                    opponentModel,
                    topic,
                    historySummary,
                    phase,
                    mode: mode === 'vs' ? '1v1' : mode,
                    turnInfo,
                    apiKeys: getApiKeys(), // BYOK
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Coach v4] Received instruction:', data);
                return data as CoachData;
            }
            return null;
        } catch (err) {
            console.error('[Coach v4] Error fetching instruction:', err);
            return null;
        }
    };

    const generateResponse = useCallback(async (options: GenerateOptions): Promise<GenerateResult> => {
        const { type, participant, previousMessages, turnNumber, turnInfo } = options;

        setIsLoading(true);
        setError(null);
        setStreamingText('');

        try {
            const allParticipantIds = participants.map(p => p.id);
            const participantStance = teamAssignments?.find(a => a.participantId === participant.id)?.stance;

            // v4: Coach API 호출
            let coachData: CoachData | null = null;
            if ((type === 'debate' || type === 'closing') && previousMessages && previousMessages.length > 0) {
                const lastMessage = previousMessages[previousMessages.length - 1];
                const opponentModel = lastMessage?.author || 'opponent';

                const historySummary = previousMessages
                    .slice(-2)
                    .map(m => `[${m.author}]: ${m.content.substring(0, 100)}...`)
                    .join('\n');

                const playerModel = participant.name.toLowerCase();
                const playerRole = options.directorStrategy?.role || 'neutral';

                coachData = await fetchCoachInstruction(
                    playerModel,
                    playerRole,
                    opponentModel,
                    historySummary,
                    type,
                    debateMode || 'vs',
                    turnInfo
                );
            }

            const response = await fetch('/api/debate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    participant,
                    topic,
                    topicData,
                    stance: participantStance,
                    context,
                    previousMessages,
                    turnNumber,
                    allParticipantIds,
                    openingSummary: options.openingSummary,
                    debateMode: debateMode || 'vs',
                    directorStrategy: options.directorStrategy,
                    coachData,
                    turnInfo,
                    apiKeys: getApiKeys(), // BYOK
                }),
            });

            if (!response.ok) {
                throw new Error('API 요청 실패');
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('스트림을 읽을 수 없습니다');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setStreamingText(cleanAIResponse(fullText));
            }

            setIsLoading(false);

            const cleanedText = cleanAIResponse(fullText);

            if (type === 'debate') {
                return { content: cleanedText };
            }

            return { content: cleanedText };

        } catch (err) {
            const message = err instanceof Error ? err.message : 'AI 응답 생성 실패';
            setError(message);
            setIsLoading(false);
            throw err;
        }
    }, [topic, topicData, context, participants, teamAssignments, debateMode, getApiKeys]);

    const generateSummary = useCallback(async (messages: DebateMessage[]): Promise<string> => {
        setIsLoading(true);
        setError(null);
        setStreamingText('');

        try {
            const response = await fetch('/api/summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    messages: messages.map(m => ({ author: m.author, content: m.content })),
                    participants,
                    apiKeys: getApiKeys(), // BYOK
                }),
            });

            if (!response.ok) throw new Error('요약 생성 실패');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('스트림을 읽을 수 없습니다');

            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                setStreamingText(fullText);
            }

            setIsLoading(false);
            return fullText;

        } catch (err) {
            const message = err instanceof Error ? err.message : '요약 생성 실패';
            setError(message);
            setIsLoading(false);
            throw err;
        }
    }, [topic, participants, getApiKeys]);

    return {
        isLoading,
        error,
        streamingText,
        generateResponse,
        generateSummary,
    };
}
