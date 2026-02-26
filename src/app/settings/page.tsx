'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Key, Eye, EyeOff, Trash2, Check, Shield, AlertTriangle } from 'lucide-react';
import { useApiKeyStore, maskApiKey, type ApiKeys } from '@/store/apiKeyStore';
import FadeInView from '@/components/FadeInView';

type ProviderConfig = {
    key: keyof ApiKeys;
    label: string;
    provider: string;
    logo: string;
    placeholder: string;
    required?: boolean;
    description: string;
};

const PROVIDERS: ProviderConfig[] = [
    {
        key: 'GOOGLE_GENERATIVE_AI_API_KEY',
        label: 'Google AI',
        provider: 'Gemini',
        logo: '/logos/gemini.svg',
        placeholder: 'AIza...',
        required: true,
        description: '필수 — 사회자, 심판, 분석 등 핵심 기능에 사용됩니다.',
    },
    {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI',
        provider: 'ChatGPT',
        logo: '/logos/openai.svg',
        placeholder: 'sk-...',
        description: '논증에 강한 ChatGPT, Moderation API에 사용됩니다.',
    },
    {
        key: 'ANTHROPIC_API_KEY',
        label: 'Anthropic',
        provider: 'Claude',
        logo: '/logos/anthropic.svg',
        placeholder: 'sk-ant-...',
        description: '균형 잡힌 시각의 Claude가 토론에 참여합니다.',
    },
    {
        key: 'XAI_API_KEY',
        label: 'xAI',
        provider: 'Grok',
        logo: '/logos/xai.svg',
        placeholder: 'xai-...',
        description: '독특한 관점의 Grok이 토론에 참여합니다.',
    },
    {
        key: 'DEEPSEEK_API_KEY',
        label: 'DeepSeek',
        provider: 'DeepSeek',
        logo: '/DeepSeek_logo.svg',
        placeholder: 'sk-...',
        description: '심층 추론 능력의 DeepSeek이 토론에 참여합니다.',
    },
    {
        key: 'BAREUN_API_KEY',
        label: 'Bareun.ai',
        provider: '형태소 분석',
        logo: '',
        placeholder: 'koba-...',
        description: '한글 키워드 추출 정확도를 높여줍니다. 공식 사이트에서는 기본 제공됩니다.',
    },
];

export default function SettingsPage() {
    const { apiKeys, setApiKey, clearAllKeys, hasAnyKey, hasMinimumKey } = useApiKeyStore();
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState('');
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [savedKey, setSavedKey] = useState<string | null>(null);

    const toggleVisibility = (key: string) => {
        setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const startEditing = (key: keyof ApiKeys) => {
        setEditingKey(key);
        setTempValue(apiKeys[key]);
    };

    const saveKey = (key: keyof ApiKeys) => {
        setApiKey(key, tempValue);
        setEditingKey(null);
        setTempValue('');
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
    };

    const cancelEditing = () => {
        setEditingKey(null);
        setTempValue('');
    };

    const handleClearAll = () => {
        clearAllKeys();
        setShowClearConfirm(false);
        setVisibleKeys({});
    };

    const configuredCount = Object.values(apiKeys).filter(v => !!v).length;

    return (
        <section className="min-h-screen p-4 pt-6">
            <div className="max-w-[420px] mx-auto pb-6">
                {/* Header */}
                <FadeInView delay={0.1}>
                    <div className="flex items-center mb-6">
                        <Link href="/">
                            <motion.div
                                className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-text-primary"
                            >
                                <ArrowLeft size={18} />
                            </motion.div>
                        </Link>
                        <h2 className="flex-1 text-center font-title text-2xl">API 키 설정</h2>
                        <div className="w-10" />
                    </div>
                </FadeInView>

                {/* Status Banner */}
                <FadeInView delay={0.15}>
                    <div className={`p-4 rounded-xl mb-6 border ${hasMinimumKey()
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-amber-50 border-amber-200'
                        }`}>
                        <div className="flex items-start gap-3">
                            {hasMinimumKey() ? (
                                <Shield size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                                <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
                            )}
                            <div>
                                <p className={`text-sm font-semibold ${hasMinimumKey() ? 'text-emerald-800' : 'text-amber-800'}`}>
                                    {hasMinimumKey()
                                        ? `${configuredCount}개 API 키가 준비되었어요`
                                        : '아직 API 키가 설정되지 않았어요'}
                                </p>
                                <p className={`text-xs mt-1 ${hasMinimumKey() ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    {hasMinimumKey()
                                        ? '토론을 시작할 준비가 되었습니다.'
                                        : 'Google AI 키를 먼저 등록해주세요. 다른 AI 키가 없으면 해당 캐릭터는 Gemini가 대신합니다.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </FadeInView>

                {/* Security Notice */}
                <FadeInView delay={0.2}>
                    <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                        <Key size={14} className="text-blue-500 shrink-0" />
                        <p className="text-[11px] text-blue-700 leading-relaxed">
                            API 키는 <strong>브라우저 로컬 저장소</strong>에만 저장됩니다.
                            서버에 영구 저장되지 않으며, API 호출 시에만 전송됩니다.
                        </p>
                    </div>
                </FadeInView>

                {/* Provider List */}
                <div className="space-y-3 mb-8">
                    {PROVIDERS.map((provider, index) => {
                        const currentValue = apiKeys[provider.key];
                        const isEditing = editingKey === provider.key;
                        const isVisible = visibleKeys[provider.key];
                        const isConfigured = !!currentValue;
                        const justSaved = savedKey === provider.key;

                        return (
                            <FadeInView key={provider.key} delay={0.25 + index * 0.05}>
                                <div className={`bg-white rounded-xl border-2 transition-all ${isEditing
                                    ? 'border-accent shadow-md'
                                    : isConfigured
                                        ? 'border-emerald-200'
                                        : 'border-gray-200'
                                    }`}>
                                    {/* Provider Header */}
                                    <div className="flex items-center gap-3 p-4">
                                        {/* Logo */}
                                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                                            {provider.logo ? (
                                                <img src={provider.logo} alt={provider.label} className="h-6" />
                                            ) : (
                                                <Key size={18} className="text-gray-400" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-text-primary">
                                                    {provider.label}
                                                </span>
                                                {provider.required && (
                                                    <span className="text-[10px] font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                                        필수
                                                    </span>
                                                )}
                                                {isConfigured && !isEditing && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                    >
                                                        <Check size={14} className="text-emerald-500" />
                                                    </motion.div>
                                                )}
                                                {justSaved && (
                                                    <motion.span
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0 }}
                                                        className="text-[10px] text-emerald-600 font-medium"
                                                    >
                                                        저장됨 ✓
                                                    </motion.span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">
                                                {provider.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Key Input Area */}
                                    <div className="px-4 pb-4">
                                        {isEditing ? (
                                            /* Edit Mode */
                                            <div>
                                                <div className="flex gap-2">
                                                    <input
                                                        type={isVisible ? 'text' : 'password'}
                                                        value={tempValue}
                                                        onChange={(e) => setTempValue(e.target.value)}
                                                        placeholder={provider.placeholder}
                                                        autoFocus
                                                        className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveKey(provider.key);
                                                            if (e.key === 'Escape') cancelEditing();
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => toggleVisibility(provider.key)}
                                                        className="w-10 h-10 flex items-center justify-center text-text-tertiary hover:text-text-primary border border-gray-200 rounded-lg"
                                                    >
                                                        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                                <div className="flex gap-2 mt-2">
                                                    <motion.button
                                                        onClick={() => saveKey(provider.key)}
                                                        className="flex-1 py-2 bg-accent text-white text-sm font-semibold rounded-lg"
                                                        whileTap={{ scale: 0.97 }}
                                                    >
                                                        저장
                                                    </motion.button>
                                                    <motion.button
                                                        onClick={cancelEditing}
                                                        className="px-4 py-2 bg-gray-100 text-text-secondary text-sm rounded-lg"
                                                        whileTap={{ scale: 0.97 }}
                                                    >
                                                        취소
                                                    </motion.button>
                                                </div>
                                            </div>
                                        ) : isConfigured ? (
                                            /* Configured State */
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm font-mono text-text-tertiary truncate">
                                                    {isVisible ? currentValue : maskApiKey(currentValue)}
                                                </div>
                                                <button
                                                    onClick={() => toggleVisibility(provider.key)}
                                                    className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-text-primary"
                                                >
                                                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <motion.button
                                                    onClick={() => startEditing(provider.key)}
                                                    className="px-3 py-2 text-xs font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5"
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    수정
                                                </motion.button>
                                                <button
                                                    onClick={() => setApiKey(provider.key, '')}
                                                    className="w-9 h-9 flex items-center justify-center text-text-tertiary hover:text-danger"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            /* Empty State */
                                            <motion.button
                                                onClick={() => startEditing(provider.key)}
                                                className="w-full py-2.5 text-sm text-accent font-medium border border-dashed border-accent/40 rounded-lg hover:bg-accent/5 transition-colors"
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                + API 키 입력
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </FadeInView>
                        );
                    })}
                </div>

                {/* Clear All Button */}
                {hasAnyKey() && (
                    <FadeInView delay={0.6}>
                        <div className="mb-8">
                            {showClearConfirm ? (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <p className="text-sm text-red-800 font-medium mb-3">
                                        모든 API 키를 삭제하시겠습니까?
                                    </p>
                                    <div className="flex gap-2">
                                        <motion.button
                                            onClick={handleClearAll}
                                            className="flex-1 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg"
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            전체 삭제
                                        </motion.button>
                                        <motion.button
                                            onClick={() => setShowClearConfirm(false)}
                                            className="px-4 py-2.5 bg-gray-100 text-text-secondary text-sm rounded-lg"
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            취소
                                        </motion.button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowClearConfirm(true)}
                                    className="w-full py-3 text-sm text-danger border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={14} />
                                    모든 API 키 삭제
                                </button>
                            )}
                        </div>
                    </FadeInView>
                )}

                {/* Help Section */}
                <FadeInView delay={0.7}>
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <h3 className="text-sm font-semibold text-text-primary mb-2">API 키 받는 방법</h3>
                        <ul className="space-y-2 text-xs text-text-secondary">
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold mt-0.5">1</span>
                                <span>각 AI 서비스의 개발자 콘솔에서 API 키를 발급받으세요.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold mt-0.5">2</span>
                                <span>위 입력란에 키를 붙여넣고 저장하면 바로 사용 가능합니다.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-accent font-bold mt-0.5">3</span>
                                <span>설정하지 않은 provider의 캐릭터는 Gemini로 자동 대체됩니다.</span>
                            </li>
                        </ul>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-[10px] text-text-tertiary leading-relaxed">
                                Google AI Studio: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-accent underline">aistudio.google.com</a><br />
                                OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-accent underline">platform.openai.com</a><br />
                                Anthropic: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="text-accent underline">console.anthropic.com</a><br />
                                xAI: <a href="https://console.x.ai" target="_blank" rel="noopener" className="text-accent underline">console.x.ai</a><br />
                                DeepSeek: <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-accent underline">platform.deepseek.com</a>
                            </p>
                        </div>
                    </div>
                </FadeInView>
            </div>
        </section>
    );
}
