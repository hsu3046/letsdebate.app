'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical } from 'lucide-react';

export interface DirectorLogEntry {
    turn: number;
    timestamp: number;
    selectedId: string;
    selectedName: string;
    instruction: string;
    candidates: { id: string; score: number }[];
    isFallback?: boolean;  // 신규: Fallback 여부
    teamAssignments?: { id: string; team: string; mission: string }[];
}

interface DirectorDebugPanelProps {
    logs: DirectorLogEntry[];
    teamAssignments?: { id: string; team: string; mission: string }[];
}

export default function DirectorDebugPanel({ logs, teamAssignments }: DirectorDebugPanelProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showTeams, setShowTeams] = useState(false);
    const [size, setSize] = useState({ width: 320, height: 280 });
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: size.width,
            startHeight: size.height,
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!resizeRef.current) return;
            const deltaX = e.clientX - resizeRef.current.startX;
            const deltaY = resizeRef.current.startY - e.clientY;  // 위로 드래그 = 높이 증가
            setSize({
                width: Math.max(280, Math.min(600, resizeRef.current.startWidth + deltaX)),
                height: Math.max(150, Math.min(500, resizeRef.current.startHeight + deltaY)),
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            resizeRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [size]);

    if (logs.length === 0 && !teamAssignments?.length) return null;

    return (
        <div
            className="fixed bottom-4 left-4 z-50"
            style={{ width: size.width }}
        >
            <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg border border-purple-500/50 shadow-xl">
                {/* 리사이즈 핸들 (우상단) */}
                <div
                    className={`absolute -top-1 -right-1 w-4 h-4 cursor-nwse-resize flex items-center justify-center
                        ${isResizing ? 'text-purple-400' : 'text-gray-500 hover:text-purple-400'}`}
                    onMouseDown={handleResizeStart}
                >
                    <GripVertical size={12} />
                </div>

                {/* 헤더 */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between px-3 py-2 text-purple-400 hover:text-purple-300"
                >
                    <span className="text-sm font-medium flex items-center gap-2">
                        🎬 Director 로그
                        <span className="text-xs text-gray-500">({logs.length})</span>
                    </span>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>

                {/* 콘텐츠 */}
                {isExpanded && (
                    <div
                        className="px-3 pb-3 space-y-2 overflow-y-auto"
                        style={{ maxHeight: size.height }}
                    >
                        {/* 팀 배정 토글 */}
                        {teamAssignments && teamAssignments.length > 0 && (
                            <button
                                onClick={() => setShowTeams(!showTeams)}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
                            >
                                {showTeams ? <EyeOff size={12} /> : <Eye size={12} />}
                                팀 배정 {showTeams ? '숨기기' : '보기'}
                            </button>
                        )}

                        {/* 팀 배정 */}
                        {showTeams && teamAssignments && (
                            <div className="bg-gray-800/50 rounded p-2 text-xs space-y-1">
                                <div className="text-gray-400 font-medium mb-1">📋 팀 배정</div>
                                {teamAssignments.map((a, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${a.team === 'PRO' ? 'bg-blue-500/20 text-blue-400' :
                                            a.team === 'CON' ? 'bg-red-500/20 text-red-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {a.team}
                                        </span>
                                        <span className="text-gray-300">{a.id}</span>
                                        <span className="text-gray-500 truncate flex-1" title={a.mission}>
                                            {a.mission}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 로그 목록 */}
                        {logs.slice().reverse().map((log, i) => (
                            <div key={i} className={`rounded p-2 text-xs ${log.isFallback ? 'bg-red-900/30 border border-red-500/30' : 'bg-gray-800/50'}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-purple-400 font-medium flex items-center gap-1">
                                        #{log.turn} → {log.selectedName}
                                        {log.isFallback && (
                                            <span className="px-1 py-0.5 bg-red-500/30 text-red-400 text-[9px] rounded">
                                                FALLBACK
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-gray-500">
                                        {log.candidates[0]?.score || '-'}점
                                    </span>
                                </div>
                                <div className={`mt-1 italic ${log.isFallback ? 'text-red-400/70' : 'text-yellow-400/80'}`}>
                                    "{log.instruction}"
                                </div>
                                {log.candidates.length > 1 && (
                                    <div className="text-gray-500 mt-1 text-[10px]">
                                        후보: {log.candidates.map(c => `${c.id}(${c.score})`).join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}

                        {logs.length === 0 && (
                            <div className="text-gray-500 text-xs text-center py-2">
                                본토론 시작 후 로그가 표시됩니다
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
