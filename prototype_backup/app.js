/* ===== 왈가왈부 - v0.1.0-beta ===== */

// ===== Constants =====
const STORAGE_KEYS = {
    THEME: 'walgawalbu_theme',
    DEBATES: 'walgawalbu_debates',
    CURRENT_SETUP: 'walgawalbu_current_setup'
};

// AI Models (internal only - never shown to users)
const AI_MODELS = [
    { id: 'gpt', name: 'GPT-4o' },
    { id: 'claude', name: 'Claude Sonnet' },
    { id: 'gemini', name: 'Gemini Flash' },
    { id: 'grok', name: 'Grok-3' }
];

// 새로운 직업 목록
const JOBS = [
    '대학교수',
    '스타트업 CEO',
    '변호사',
    '의사/연구자',
    '베테랑 회사원',
    '가정주부',
    '자영업자',
    '대학생/취준생',
    '저널리스트',
    '인플루언서',
    'SF 소설가',
    '방구석 평론가'
];

// 새로운 나이대
const AGES = ['20대', '30대', '40대', '50대', '60대+'];

// 새로운 논증 성향
const STYLES = [
    { id: 'analyst', name: '냉철한 분석가', desc: '팩트와 통계가 아니면 취급 안 함' },
    { id: 'humanist', name: '뜨거운 인본주의', desc: '사람이 먼저, 윤리와 감정에 호소' },
    { id: 'pragmatist', name: '철저한 실용주의', desc: '명분보단 이익, 가성비와 효율 중시' },
    { id: 'reformer', name: '급진적 개혁가', desc: '갈아엎자! 기술과 혁신이 답이다' },
    { id: 'conservative', name: '신중한 보수파', desc: '구관이 명관, 급격한 변화 경계' },
    { id: 'advocate', name: '악마의 대변인', desc: '무조건 반대, 상대 논리의 허점 찌르기' }
];

const POSITIONS = {
    pro: '찬성',
    con: '반대',
    neutral: '중립'
};

const AVATARS = ['A', 'B', 'C', 'D', 'E', 'F'];

const PANELIST_COLORS = ['panelist-1', 'panelist-2', 'panelist-3', 'panelist-4', 'panelist-5', 'panelist-6'];

// Default ages assigned to each slot (not randomized)
const DEFAULT_AGES = ['40대', '30대', '50대', '20대'];

// ===== State =====
let currentSetup = {
    topic: '',
    context: '',
    participantCount: 3,
    turnCount: 5,
    progressionMode: 'manual',
    participants: [],
    humanParticipation: false,
    humanName: ''
};

let debateState = {
    isRunning: false,
    isPaused: false,
    isFinished: false,
    wasStopped: false,
    currentTurn: 0,
    currentPhase: 'intro',
    debateTurn: 0, // Turn within debate phase
    totalDebateTurns: 0, // Total turns for debate phase
    messages: [],
    intervalId: null,
    showModeratorPanel: false
};

// ===== Theme Management =====
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
    lucide.createIcons();
}

function loadTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || (saved == null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    }
}

// ===== Modal Management =====
function showUsageInfo() {
    document.getElementById('usage-modal').classList.remove('hidden');
    lucide.createIcons();
}

function showHelp() {
    document.getElementById('help-modal').classList.remove('hidden');
    lucide.createIcons();
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// ===== Navigation =====
function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
        setTimeout(() => lucide.createIcons(), 50);
    }

    if (screenId === 'participants-screen') {
        generateParticipantSlots();
    } else if (screenId === 'main-screen') {
        loadDebateHistory();
    }
}

// ===== Form Helpers =====
function updateCounter(inputId, counterId, max) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    if (input && counter) {
        const length = input.value.length;
        counter.textContent = length;
        counter.style.color = length > max * 0.9 ? 'var(--warning)' : '';
    }
}

function updateTurnDisplay(value) {
    document.getElementById('turn-display').textContent = value;
}

// ===== Setup Logic =====
function saveSetupAndNext() {
    const topic = document.getElementById('topic-input').value.trim();
    const context = document.getElementById('context-input').value.trim();
    const turnSlider = document.getElementById('turn-slider');
    const progression = document.querySelector('input[name="progression"]:checked');

    if (!topic) {
        alert('토론 주제를 입력해주세요!');
        return;
    }

    currentSetup.topic = topic;
    currentSetup.context = context;
    currentSetup.turnCount = parseInt(turnSlider.value);
    currentSetup.progressionMode = progression ? progression.value : 'manual';

    localStorage.setItem(STORAGE_KEYS.CURRENT_SETUP, JSON.stringify(currentSetup));

    navigateTo('participants-screen');
}

// ===== Human Participation Toggle =====
function toggleHumanParticipation() {
    const isChecked = document.getElementById('human-participation').checked;
    const nameWrapper = document.getElementById('human-name-wrapper');

    if (isChecked) {
        // Show name input
        nameWrapper.classList.remove('hidden');

        // Check if auto mode was selected - warn and switch to manual
        if (currentSetup.progressionMode === 'auto') {
            alert('인간 참여 시에는 턴별 진행 모드만 가능합니다.\n자동 진행에서 턴별 진행으로 변경됩니다.');
            currentSetup.progressionMode = 'manual';
            // Update UI on setup screen if visible
            const manualRadio = document.getElementById('progression-manual');
            if (manualRadio) manualRadio.checked = true;
        }
    } else {
        nameWrapper.classList.add('hidden');
    }

    currentSetup.humanParticipation = isChecked;
    updateParticipantLimits();
}

// ===== Participant Limits Logic =====
// Total participants: 2~4, if human joins (1), AI is 1~3
function updateParticipantLimits() {
    const hintText = document.getElementById('count-hint-text');
    const countDisplay = document.getElementById('participant-count-display');

    if (currentSetup.humanParticipation) {
        // Human counts as 1, AI can be 1~3
        hintText.textContent = '최대 3명';
        if (currentSetup.participantCount > 3) {
            currentSetup.participantCount = 3;
            generateParticipantSlots();
        }
        if (currentSetup.participantCount < 1) {
            currentSetup.participantCount = 1;
            generateParticipantSlots();
        }
    } else {
        // No human, AI can be 2~4
        hintText.textContent = '최대 4명';
        if (currentSetup.participantCount > 4) {
            currentSetup.participantCount = 4;
            generateParticipantSlots();
        }
        if (currentSetup.participantCount < 2) {
            currentSetup.participantCount = 2;
            generateParticipantSlots();
        }
    }
    countDisplay.textContent = currentSetup.participantCount;
}

// ===== Participant Count Control =====
function changeParticipantCount(delta) {
    const minCount = currentSetup.humanParticipation ? 1 : 2;
    const maxCount = currentSetup.humanParticipation ? 3 : 4;

    const newCount = currentSetup.participantCount + delta;
    if (newCount >= minCount && newCount <= maxCount) {
        currentSetup.participantCount = newCount;
        document.getElementById('participant-count-display').textContent = newCount;
        generateParticipantSlots();
    }
}

// ===== Participant Management =====
function generateParticipantSlots() {
    const container = document.getElementById('participant-slots');
    const count = currentSetup.participantCount;

    document.getElementById('participant-count-display').textContent = count;
    updateParticipantLimits();

    container.innerHTML = '';

    const positionOrder = ['pro', 'con', 'neutral', 'pro', 'con', 'neutral'];
    const names = ['김반박', '이통계', '박현실', '정이상'];

    for (let i = 0; i < count; i++) {
        const avatarNum = (i % 6) + 1;
        const position = positionOrder[i];
        const job = JOBS[i % JOBS.length];
        const age = DEFAULT_AGES[i % DEFAULT_AGES.length]; // Fixed ages, not random
        const style = STYLES[i % STYLES.length];

        const slot = document.createElement('div');
        slot.className = `participant-slot color-${avatarNum}`;
        slot.innerHTML = `
            <div class="slot-header">
                <div class="avatar avatar-${avatarNum}">${AVATARS[i]}</div>
                <div class="slot-name-wrapper">
                    <input type="text" 
                        class="slot-name-input" 
                        value="${names[i] || '패널 ' + (i + 1)}" 
                        placeholder="이름 입력"
                        data-index="${i}">
                </div>
            </div>
            <div class="slot-details">
                <div class="slot-field">
                    <label>직업</label>
                    <select class="slot-select" data-type="job" data-index="${i}">
                        ${JOBS.map(j => `<option value="${j}" ${j === job ? 'selected' : ''}>${j}</option>`).join('')}
                    </select>
                </div>
                <div class="slot-field">
                    <label>나이대</label>
                    <select class="slot-select" data-type="age" data-index="${i}">
                        ${AGES.map(a => `<option value="${a}" ${a === age ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                </div>
                <div class="slot-field">
                    <label>포지션</label>
                    <select class="slot-select" data-type="position" data-index="${i}">
                        <option value="pro" ${position === 'pro' ? 'selected' : ''}>찬성</option>
                        <option value="con" ${position === 'con' ? 'selected' : ''}>반대</option>
                        <option value="neutral" ${position === 'neutral' ? 'selected' : ''}>중립</option>
                    </select>
                </div>
                <div class="slot-field">
                    <label>논증 성향</label>
                    <select class="slot-select" data-type="style" data-index="${i}" title="${style.desc}">
                        ${STYLES.map(s => `<option value="${s.id}" ${s.id === style.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(slot);
    }

    setTimeout(() => lucide.createIcons(), 50);
}

function randomizeParticipants() {
    const slots = document.querySelectorAll('.participant-slot');
    const names = ['김반박', '이통계', '박현실', '정이상'];
    const shuffledNames = [...names].sort(() => Math.random() - 0.5);

    slots.forEach((slot, index) => {
        const nameInput = slot.querySelector('.slot-name-input');
        nameInput.value = shuffledNames[index] || `패널 ${index + 1}`;

        slot.querySelectorAll('.slot-select').forEach(select => {
            const options = select.options;
            const randomIndex = Math.floor(Math.random() * options.length);
            select.selectedIndex = randomIndex;
        });
    });
}

function collectParticipants() {
    const slots = document.querySelectorAll('.participant-slot');
    const participants = [];

    slots.forEach((slot, index) => {
        const name = slot.querySelector('.slot-name-input').value.trim() || `패널 ${index + 1}`;
        const job = slot.querySelector('select[data-type="job"]').value;
        const age = slot.querySelector('select[data-type="age"]').value;
        const position = slot.querySelector('select[data-type="position"]').value;
        const styleId = slot.querySelector('select[data-type="style"]').value;
        const style = STYLES.find(s => s.id === styleId) || STYLES[0];
        const model = AI_MODELS[index % AI_MODELS.length]; // Internal only
        const avatarNum = (index % 6) + 1;

        participants.push({
            id: `p${index}`,
            name,
            job,
            age,
            position,
            style: style.name,
            styleId: style.id,
            modelId: model.id,
            avatar: AVATARS[index],
            avatarClass: `avatar-${avatarNum}`,
            colorClass: PANELIST_COLORS[index % PANELIST_COLORS.length],
            wordCount: 0 // Track word count for stats
        });
    });

    return participants;
}

// ===== Debate Logic =====
function startDebate() {
    // Capture human name if participating
    if (currentSetup.humanParticipation) {
        const humanNameInput = document.getElementById('human-name-input');
        currentSetup.humanName = humanNameInput ? humanNameInput.value.trim() || '참여자' : '참여자';
    } else {
        currentSetup.humanName = '';
    }

    currentSetup.participants = collectParticipants();

    // Calculate total debate turns
    const totalDebateTurns = Math.min(currentSetup.turnCount * 2, 12);

    debateState = {
        isRunning: true,
        isPaused: false,
        isFinished: false,
        wasStopped: false,
        currentTurn: 1,
        currentPhase: 'intro',
        debateTurn: 0,
        totalDebateTurns: Math.ceil(totalDebateTurns / currentSetup.participants.length),
        messages: [],
        intervalId: null,
        showModeratorPanel: false,
        waitingForHumanInput: false,
        humanInputType: null
    };

    // Update arena UI
    document.getElementById('arena-topic').textContent = currentSetup.topic;
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('messages-container').innerHTML = '';

    // Reset controls
    document.getElementById('arena-controls').classList.remove('hidden');
    document.getElementById('complete-btn').classList.add('hidden');
    document.getElementById('moderator-panel').classList.add('hidden');
    document.getElementById('debate-turn-inline').textContent = '';

    // Show/hide moderator button based on mode
    const moderatorBtn = document.getElementById('moderator-btn');
    if (currentSetup.progressionMode === 'manual') {
        moderatorBtn.classList.remove('hidden');
    } else {
        moderatorBtn.classList.add('hidden');
    }

    updatePhaseIndicator('intro');

    navigateTo('arena-screen');

    setTimeout(runDebateSimulation, 500);
}

function updatePhaseIndicator(phase) {
    const phases = ['intro', 'topic', 'opening', 'debate', 'summary'];
    const currentIndex = phases.indexOf(phase);

    document.querySelectorAll('.phase-tag').forEach((tag, index) => {
        tag.classList.remove('active', 'completed');
        if (index < currentIndex) {
            tag.classList.add('completed');
        } else if (index === currentIndex) {
            tag.classList.add('active');
        }
    });

    // Update debate turn inline display
    const turnInline = document.getElementById('debate-turn-inline');
    if (phase === 'debate' && debateState.debateTurn > 0) {
        turnInline.textContent = `(${debateState.debateTurn}/${debateState.totalDebateTurns})`;
    } else {
        turnInline.textContent = '';
    }

    debateState.currentPhase = phase;
}

// ===== Extended Debate Simulation (NO EMOJIS, NO LEADING SPACES) =====
function generateIntroDialogue() {
    // Build human intro if participating
    let humanIntro = '';
    if (currentSetup.humanParticipation && currentSetup.humanName) {
        const humanNum = currentSetup.participants.length + 1;
        humanIntro = `\n${humanNum}. ${currentSetup.humanName} - 직접 참여자 (본인)`;
    }

    const participantIntro = currentSetup.participants.map((p, i) =>
        `${i + 1}. ${p.name} - ${p.job}, ${p.age} (${p.style})`
    ).join('\n');

    const content =
        `안녕하세요, 오늘 토론의 사회를 맡게 된 AI 사회자입니다.
여러분을 왈가왈부에 오신 것을 환영합니다!

오늘 우리와 함께할 패널분들을 소개해 드리겠습니다.

${participantIntro}${humanIntro}

각자의 전문성과 독특한 시각을 바탕으로 열띠 토론이 펼쳐질 예정입니다.

자, 그럼 시작해볼까요?`;

    return {
        role: 'moderator',
        phase: 'intro',
        content: content
    };
}

function generateTopicDialogue() {
    const contextPart = currentSetup.context ?
        `\n배경 설명:\n${currentSetup.context}\n` : '';

    const content =
        `그럼 오늘의 토론 주제를 발표하겠습니다.

"${currentSetup.topic}"${contextPart}
이 주제는 우리 사회와 산업에 중요한 영향을 미칠 수 있는 이슈입니다.

각 패널분들께서는 자신만의 시각과 논증 스타일을 살려 다양한 관점을 제시해 주시기 바랍니다.

그럼 기조 발언부터 시작하겠습니다.`;

    return {
        role: 'moderator',
        phase: 'topic',
        content: content
    };
}

function generateOpeningDialogues() {
    const dialogues = currentSetup.participants.map((p, index) => ({
        participantIndex: index,
        phase: 'opening',
        content: generateOpeningStatement(p),
        isHuman: false
    }));

    // Add human opening if participating
    if (currentSetup.humanParticipation && currentSetup.humanName) {
        dialogues.push({
            participantIndex: -1,
            phase: 'opening',
            content: '', // Will be filled by user input
            isHuman: true
        });
    }

    return dialogues;
}

function generateOpeningStatement(participant) {
    // 논증 성향별 템플릿 (no emojis, no leading spaces)
    const styleTemplates = {
        analyst: `안녕하세요, ${participant.job} ${participant.name}입니다.
저는 데이터와 팩트를 기반으로 말씀드리겠습니다.

이 이슈에 대한 통계를 보면, 찬반 양쪽 모두 주장할 근거가 있습니다.
하지만 감정에 휩쓸리기 전에 객관적인 수치부터 살펴봐야 합니다.

핵심 지표 세 가지를 보면:
첫째, 시장 규모 변화.
둘째, 기술 채택률.
셋째, 사회적 비용-편익 분석입니다.

이 숫자들이 말하는 바를 따라가면 결론은 자명합니다.
먼저 반대쪽에서 제시한 데이터의 출처와 신뢰도부터 점검해 봐야 할 것 같습니다.`,

        humanist: `${participant.job} ${participant.name}입니다.
저는 이 이슈를 사람 중심으로 바라보고 싶습니다.

기술이든 제도든, 결국 그 영향을 받는 것은 살아있는 사람들입니다.
누군가의 삶이 나아질 수 있다면 왜 주저하겠습니까?

저는 세 가지를 강조하고 싶어요.
첫째, 소외되는 사람이 없어야 합니다.
둘째, 미래 세대의 눈높이에서 생각해야 합니다.
셋째, 숫자 뒤에 숨은 개인의 이야기에 귀 기울여야 합니다.

효율만 따지다가 놓치는 것들, 그게 더 비싼 대가를 치르게 하지 않을까요?`,

        pragmatist: `${participant.job} ${participant.name}입니다.
솔직히 말씀드리면, 저는 명분보다 실리를 중시합니다.

아름다운 비전도 좋지만, 결국 "그래서 돈이 되느냐, 실현 가능하냐"가 핵심이에요.
유토피아적 청사진이 실패한 사례는 역사에 넘쳐납니다.

저는 이렇게 제안합니다.
첫째, 투자 대비 수익(ROI)을 먼저 계산하자.
둘째, 단기적 리스크 관리가 우선이다.
셋째, 실행 가능한 작은 것부터 시작하자.

이상적인 토론은 좋지만, 현실에서 작동하는 해결책을 찾아봅시다.`,

        reformer: `${participant.job} ${participant.name}입니다.
저는 확실하게 말씀드리겠습니다 - 갈아엎을 때가 됐어요!

기존 시스템은 이미 한계에 다다랐습니다.
조금씩 손보는 건 시간 낭비예요.
대담한 변화만이 돌파구입니다.

기술이 답입니다.
첫째, AI와 자동화를 전면 도입해야 합니다.
둘째, 규제부터 싹 갈아엎어야 합니다.
셋째, 구시대적 관행은 과감히 버려야죠.

"위험하다"는 반론이 나오겠지만, 변화하지 않는 것이 가장 큰 리스크입니다!`,

        conservative: `${participant.job} ${participant.name}입니다.
저는 신중한 입장을 취하겠습니다.

오랫동안 검증된 것에는 이유가 있습니다.
새것이라고 무조건 좋은 게 아니에요.
지금까지 버텨온 시스템의 지혜를 무시하면 안 됩니다.

제 우려는 세 가지입니다.
첫째, 검증 안 된 것에 뛰어드는 건 도박입니다.
둘째, 기존 가치와 노하우가 사라지면 되돌리기 어렵습니다.
셋째, 점진적 개선이 급진적 변화보다 안전합니다.

"보수꼰대"라고 하셔도 좋아요. 하지만 후회는 나중에 해도 늦습니다.`,

        advocate: `${participant.job} ${participant.name}입니다.
일단 반대합니다.

왜냐고요? 여러분 주장에 구멍이 많으니까요.
모두가 박수 칠 때 누군가는 문제를 짚어야 합니다.

제가 찌를 포인트는 명확해요.
첫째, 그 근거 진짜 맞습니까?
둘째, 반대 의견은 왜 무시하죠?
셋째, 최악의 시나리오는 고려하셨나요?

저는 싸우려는 게 아니에요.
그냥 다들 빠뜨린 걸 짚어주는 것뿐입니다.`
    };

    return styleTemplates[participant.styleId] || styleTemplates.pragmatist;
}

function generateDebateDialogues() {
    const dialogues = [];
    const debateCount = Math.min(currentSetup.turnCount * 2, 12);

    for (let i = 0; i < debateCount; i++) {
        const pIndex = i % currentSetup.participants.length;
        const turnNumber = Math.floor(i / currentSetup.participants.length) + 1;
        dialogues.push({
            participantIndex: pIndex,
            phase: 'debate',
            turnNumber: turnNumber,
            content: generateDebateResponse(currentSetup.participants[pIndex], i)
        });
    }

    return dialogues;
}

function generateDebateResponse(participant, turnIndex) {
    const styleResponses = {
        analyst: [
            `앞서 말씀하신 주장, 근거가 부족해 보입니다.
데이터로 검증해보죠.

실제 수치를 보면 상황이 다릅니다.
최근 연구에 따르면 해당 분야의 성장률은 예상보다 낮았고, 비용 효율성도 의문입니다.
이건 감정이 아니라 팩트입니다.

제가 계산한 바로는 최적의 접근법이 따로 있어요.
물론 100% 확신은 아니지만, 확률적으로 이게 맞습니다.
혹시 다른 데이터 있으시면 공유해주세요.`,

            `흥미로운 논점이네요.
하지만 상관관계와 인과관계를 혼동하시는 것 같습니다.

A가 일어났고 B가 따라왔다고 해서 A 때문에 B가 생긴 건 아니에요.
숨은 변수 C를 고려하면 해석이 달라집니다.

객관적으로 보면, 우리가 통제할 수 있는 변수와 없는 변수를 구분해야 합니다.`
        ],
        humanist: [
            `논리적으로는 맞을 수 있어요.
하지만 그 뒤에 있는 '사람'을 잊으면 안 됩니다.

효율성, 경제성... 다 중요하죠.
하지만 그래서 누가 행복해지나요?
숫자로 환산할 수 없는 가치도 있습니다.

저는 이런 질문을 던지고 싶어요.
"우리 부모님이나 자녀가 같은 상황이라면?"
개인의 존엄과 삶의 질, 이게 정책의 출발점이어야 합니다.`,

            `저도 이성적으로 생각하려 해요.
하지만 인간의 감정과 관계를 배제한 해결책은 오래가지 못합니다.

기술이 발전해도 결국 그걸 쓰는 건 사람이에요.
사람의 마음을 움직이지 못하는 변화는 지속되기 어렵습니다.

공동체의 신뢰와 연대, 이것부터 세워야 나머지가 따라옵니다.`
        ],
        pragmatist: [
            `좋은 말씀들 많이 나왔는데, 현실을 보죠.

그래서 누가 돈을 내나요?
예산은 어디서 오죠?
실행 책임은 누가 지나요?
비전은 훌륭하지만 현실성이 떨어집니다.

저는 지금 당장 가능한 것부터 시작하자는 겁니다.
거창한 마스터플랜보다 작은 성공 사례가 더 설득력 있어요.`,

            `이상적인 시나리오는 들었습니다.
이번엔 B플랜 얘기합시다.

실패하면 어떻게 되죠?
리스크 관리는요?
'될 거야'가 아니라 '안 되면 어쩌지'를 먼저 생각해야 합니다.

저는 최악의 상황에서도 버틸 수 있는 안전판부터 마련하자구요.`
        ],
        reformer: [
            `와, 정말 보수적인 발상이네요!
왜 자꾸 과거에 발목 잡히시는 거예요?

세상은 이미 변했어요.
기존 방식대로 하면 뒤처질 뿐입니다.
선진국들은 벌써 다음 단계로 넘어갔다구요.

저는 파괴적 혁신을 말하는 겁니다.
불편하시죠? 하지만 그게 성장통입니다!`,

            `"위험하다"는 말, 예상했어요.
변화를 거부하는 사람들의 단골 멘트죠.

그런데 말이에요, 현재도 충분히 위험합니다.
가만히 있으면 안전한 줄 아세요?
도태되는 게 더 위험해요.

저는 빠르게 시도하고, 빠르게 수정하자는 겁니다.
완벽한 준비는 없어요.`
        ],
        conservative: [
            `급하게 가실 필요 없어요.
서두르다 일 그르칩니다.

지금 작동하는 시스템을 왜 뒤엎으려 하시죠?
개선할 점이 있으면 조금씩 고치면 됩니다.
모든 걸 갈아엎는 건 무모해요.

제가 보기엔 아직 검증이 부족합니다.
좀 더 지켜보면서 데이터 쌓인 다음에 판단해도 늦지 않아요.`,

            `혁신이라고 다 좋은 건 아닙니다.
빠른 것이 좋은 것도 아니구요.

우리가 지켜온 가치와 경험에도 지혜가 있어요.
그걸 무시하면 같은 실수를 반복합니다.

저는 변화를 반대하는 게 아닙니다.
준비된 변화를 주장하는 겁니다.`
        ],
        advocate: [
            `잠깐요, 다들 너무 쉽게 동의하시네요.
제가 좀 문제를 짚어볼게요.

첫째, 그 전제 자체가 맞나요?
둘째, 반증 사례는 무시하시고요?
셋째, 그게 정말 인과관계인가요?

저는 악의로 이러는 게 아니에요.
그냥 빈틈이 보여서 지적하는 겁니다.
논리가 튼튼해야 결론도 믿을 수 있잖아요.`,

            `다들 동의하니까 맞는 건가요?
다수결이 진리는 아닙니다.

여기서 빠진 게 있어요.
최악의 시나리오는요?
"그럴 리 없다"는 근거 있나요?
희망사항만으론 부족합니다.

냉소적이라구요?
저는 현실적인 겁니다.
누군가는 이런 역할을 해야죠.`
        ]
    };

    const responses = styleResponses[participant.styleId] || styleResponses.pragmatist;
    return responses[turnIndex % responses.length] || responses[0];
}

function generateSummaryDialogue() {
    return {
        role: 'moderator',
        phase: 'summary',
        content: `오늘 토론에 참여해주신 모든 패널분들께 감사드립니다.
열띤 토론 끝에 다양한 관점이 쏟아져 나왔습니다.

[핵심 논점 정리]

데이터 기반 분석파에서는 객관적 수치와 연구 결과를 바탕으로 신중한 접근을 강조했습니다.
감정보다 팩트에 기반한 결정이 필요하다는 것이죠.

인간 중심 관점에서는 효율성 이면에 있는 '사람'을 잊지 말자고 했습니다.
숫자로 환산할 수 없는 가치도 분명히 존재합니다.

실용주의 진영에서는 "그래서 실행 가능하냐?"를 따졌습니다.
비전보다 구체적인 실행 계획이 중요하다는 입장이었죠.

혁신론자들은 과감한 변화를 촉구했습니다.
가만히 있는 것도 리스크라며 빠른 시도와 수정을 강조했습니다.

신중론자들은 급진적 변화에 경고등을 켰습니다.
검증된 것의 가치와 점진적 개선을 주장했어요.

악마의 대변인은 모든 주장의 빈틈을 찔렀습니다.
불편하지만 필요한 역할이었습니다.

[시사점]

결국 이 토론이 보여주는 것은 '정답'이 없다는 것입니다.
각자의 시각과 가치관에 따라 다른 결론이 나올 수 있어요.

중요한 건 다양한 관점을 접하고, 자신의 생각을 점검해 보는 것입니다.
오늘 토론이 여러분의 사고를 확장하는 데 도움이 되었기를 바랍니다.

시청해 주셔서 감사합니다. 왈가왈부였습니다!`
    };
}

let allDialogues = [];
let messageIndex = 0;

function runDebateSimulation() {
    // Generate all dialogues
    allDialogues = [
        generateIntroDialogue(),
        generateTopicDialogue(),
        ...generateOpeningDialogues(),
        ...generateDebateDialogues(),
        generateSummaryDialogue()
    ];

    messageIndex = 0;
    addNextMessage();
}

function addNextMessage() {
    if (!debateState.isRunning || debateState.isPaused) return;
    if (debateState.waitingForHumanInput) return;
    if (messageIndex >= allDialogues.length) {
        finishDebateSimulation();
        return;
    }

    const dialogue = allDialogues[messageIndex];

    // Check if this is human's turn
    if (dialogue.isHuman) {
        // Update phase indicator
        if (dialogue.phase && dialogue.phase !== debateState.currentPhase) {
            updatePhaseIndicator(dialogue.phase);
            addPhaseHeader(dialogue.phase);
        }

        // Show human input panel
        const labelText = dialogue.phase === 'opening' ?
            `${currentSetup.humanName}님의 기조발언을 입력하세요` :
            `${currentSetup.humanName}님의 의견을 입력하세요`;
        showHumanInputPanel(dialogue.phase, labelText);
        return;
    }

    // Update phase indicator
    if (dialogue.phase && dialogue.phase !== debateState.currentPhase) {
        if (dialogue.phase === 'debate') {
            debateState.debateTurn = 1;
        }
        updatePhaseIndicator(dialogue.phase);
        addPhaseHeader(dialogue.phase);
    }

    // Update debate turn inline display
    if (dialogue.phase === 'debate' && dialogue.turnNumber) {
        debateState.debateTurn = dialogue.turnNumber;
        updatePhaseIndicator('debate');
    }

    let author, avatar, avatarClass, content, info, colorClass, isModerator;

    if (dialogue.role === 'moderator') {
        author = '사회자';
        avatar = 'mic'; // Use mic icon
        avatarClass = 'moderator-avatar';
        content = dialogue.content;
        info = '';
        colorClass = 'moderator';
        isModerator = true;
    } else {
        const pIndex = dialogue.participantIndex % currentSetup.participants.length;
        const participant = currentSetup.participants[pIndex];
        author = participant.name;
        avatar = participant.avatar;
        avatarClass = participant.avatarClass;
        content = dialogue.content;
        info = `${participant.job} · ${participant.age}`;
        colorClass = participant.colorClass;
        isModerator = false;

        // Update word count
        participant.wordCount += content.replace(/\s+/g, ' ').split(' ').length;
    }

    addMessageToUI(author, avatar, avatarClass, content, info, isModerator, colorClass);

    // Update progress
    const progress = ((messageIndex + 1) / allDialogues.length) * 100;
    document.getElementById('progress-bar').style.width = progress + '%';

    debateState.currentTurn = Math.min(Math.ceil((messageIndex + 1) / 3), currentSetup.turnCount);

    // Save message
    debateState.messages.push({ author, content, isModerator, colorClass, charCount: content.length });

    messageIndex++;

    // Schedule next message
    debateState.intervalId = setTimeout(addNextMessage, 4000);
}

function addPhaseHeader(phase) {
    const container = document.getElementById('messages-container');
    const phaseNames = {
        intro: '사회자 인사 및 토론자 소개',
        topic: '토론 주제 발표',
        opening: '기조 발언',
        debate: '본격 토론',
        summary: '사회자 정리 및 마무리'
    };

    const header = document.createElement('div');
    header.className = 'phase-header';
    header.innerHTML = `
        <span class="phase-header-tag">
            <i data-lucide="chevrons-right"></i>
            ${phaseNames[phase] || phase}
        </span>
    `;
    container.appendChild(header);
    lucide.createIcons();
}

function addMessageToUI(author, avatar, avatarClass, content, info, isModerator, colorClass) {
    const container = document.getElementById('messages-container');

    const message = document.createElement('div');
    message.className = `message ${isModerator ? 'moderator' : colorClass}`;

    // Different avatar for moderator (mic icon) vs panelists (letter)
    const avatarContent = isModerator ?
        `<i data-lucide="mic"></i>` :
        avatar;

    message.innerHTML = `
        <div class="message-header">
            <div class="message-avatar ${avatarClass}">${avatarContent}</div>
            <div class="message-meta">
                <span class="message-author">${author}</span>
                ${info ? `<span class="message-info">${info}</span>` : ''}
            </div>
        </div>
        <div class="message-bubble">
            <span class="message-text"></span>
        </div>
    `;

    container.appendChild(message);
    lucide.createIcons();

    // Typing effect
    const textSpan = message.querySelector('.message-text');
    typeText(textSpan, content, 6);

    // Scroll to bottom
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 100);
}

function typeText(element, text, speed) {
    let i = 0;
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

// ===== Moderator Intervention =====
let wasPlayingBeforePanel = false;

function toggleModeratorPanel() {
    debateState.showModeratorPanel = !debateState.showModeratorPanel;
    const panel = document.getElementById('moderator-panel');

    if (debateState.showModeratorPanel) {
        // Save current play state and pause if auto mode
        if (!debateState.isPaused && currentSetup.progressionMode === 'auto') {
            wasPlayingBeforePanel = true;
            debateState.isPaused = true;
            if (debateState.intervalId) {
                clearTimeout(debateState.intervalId);
            }
        }
        panel.classList.remove('hidden');
    } else {
        closeModeratorPanel();
    }
}

function closeModeratorPanel() {
    const panel = document.getElementById('moderator-panel');
    panel.classList.add('hidden');
    debateState.showModeratorPanel = false;

    // Resume auto play if it was playing before
    if (wasPlayingBeforePanel) {
        wasPlayingBeforePanel = false;
        debateState.isPaused = false;
        addNextMessage();
    }
    lucide.createIcons();
}

function sendIntervention(keyword) {
    // Convert short keywords to natural moderator dialogue
    const interventionTemplates = {
        '이 논점을 더 깊이 다뤄주세요': [
            '잠깐요, 방금 말씀하신 부분이 정말 흥미롭습니다. 이 논점을 조금 더 깊이 파고들어 볼까요? 구체적인 근거나 예시가 있다면 더 좋겠습니다.',
            '좋은 포인트입니다. 여기서 멈추기엔 아쉬운데요, 이 주제를 좀 더 심도 있게 다뤄보시겠어요?'
        ],
        '다른 관점도 들어보고 싶어요': [
            '지금까지 한쪽 시각이 많이 나왔는데요, 혹시 다른 관점에서 바라보시는 분 계신가요? 반대 의견이나 새로운 시각도 궁금합니다.',
            '균형 잡힌 토론을 위해 다른 시각도 들어보겠습니다. 다른 의견 있으신 분?'
        ],
        '잠깐, 주제가 빗나갔어요': [
            '잠시만요! 논의가 약간 옆길로 새는 것 같습니다. 원래 주제로 돌아가서, 핵심 쟁점에 집중해 볼까요?',
            '좋은 이야기들이지만, 본론에서 벗어난 것 같네요. 다시 주제로 돌아가겠습니다.'
        ],
        '찬성 측 의견 더 들어보자': [
            '찬성 쪽에서 추가로 말씀하실 분 계신가요? 아직 못 다한 논거가 있다면 들어보겠습니다.',
            '찬성 측의 주장을 좀 더 들어보고 싶습니다. 보충하실 내용 있으신가요?'
        ],
        '반대 측 의견 더 들어보자': [
            '반대 쪽에서 반박하실 분 계신가요? 방금 나온 주장에 대해 다른 생각이 있으시면 말씀해 주세요.',
            '반대 측의 목소리도 더 들어보겠습니다. 추가 의견 있으신가요?'
        ],
        '구체적인 예시를 들어주세요': [
            '추상적인 논의도 좋지만, 실제 사례나 구체적인 예시가 있으면 이해하기 쉬울 것 같습니다. 혹시 예를 들어 설명해 주실 수 있나요?',
            '구체적인 예시가 있으면 좋겠네요. 실제 적용된 사례를 아시는 분?'
        ],
        '정리하고 다음 주제로 넘어갑시다': [
            '이 주제에 대해 충분히 논의한 것 같습니다. 잠깐 정리하고, 다음 논점으로 넘어가 보겠습니다.',
            '좋습니다, 이 부분은 여기까지 하고 다음 이슈로 넘어가볼까요?'
        ],
        '이 주제는 여기까지 하겠습니다': [
            '이 논점에 대해서는 충분한 의견이 나온 것 같습니다. 여기서 마무리하고 다음 단계로 진행하겠습니다.',
            '좋습니다. 이 주제는 여기서 정리하고, 토론을 진전시켜 보겠습니다.'
        ]
    };

    // Select random template for the keyword, or use keyword as-is if no template
    const templates = interventionTemplates[keyword];
    const text = templates ? templates[Math.floor(Math.random() * templates.length)] : keyword;

    addMessageToUI('사회자', 'mic', 'moderator-avatar', text, '', true, 'moderator');
    debateState.messages.push({ author: '사회자', content: text, isModerator: true, charCount: text.length });
    closeModeratorPanel();
}

// ===== Human Input Handling =====
function showHumanInputPanel(type, label) {
    debateState.waitingForHumanInput = true;
    debateState.humanInputType = type;

    const panel = document.getElementById('human-input-panel');
    const labelEl = document.getElementById('human-input-label');
    const textarea = document.getElementById('human-input-textarea');

    labelEl.textContent = label;
    textarea.value = '';
    textarea.placeholder = type === 'opening' ? '기조발언을 입력하세요...' : '의견을 입력하세요...';
    panel.classList.remove('hidden');

    // Hide controls while waiting for input
    document.getElementById('arena-controls').classList.add('hidden');

    lucide.createIcons();
}

function hideHumanInputPanel() {
    debateState.waitingForHumanInput = false;
    debateState.humanInputType = null;

    document.getElementById('human-input-panel').classList.add('hidden');
    document.getElementById('arena-controls').classList.remove('hidden');
}

function submitHumanInput() {
    const textarea = document.getElementById('human-input-textarea');
    const content = textarea.value.trim();

    if (!content) {
        alert('내용을 입력해주세요!');
        return;
    }

    const inputType = debateState.humanInputType;

    // Add human message to UI
    addMessageToUI(
        currentSetup.humanName,
        '나',
        'human-avatar',
        content,
        '직접 참여자',
        false,
        'human'
    );

    // Save to messages
    debateState.messages.push({
        author: currentSetup.humanName,
        content: content,
        isModerator: false,
        colorClass: 'human',
        charCount: content.length
    });

    hideHumanInputPanel();

    // Continue debate simulation
    messageIndex++;
    setTimeout(addNextMessage, 1000);
}

// ===== Debate Control =====
function togglePause() {
    debateState.isPaused = !debateState.isPaused;

    const pauseBtn = document.getElementById('pause-btn');
    const icon = pauseBtn.querySelector('svg');

    if (debateState.isPaused) {
        icon.setAttribute('data-lucide', 'play');
    } else {
        icon.setAttribute('data-lucide', 'pause');
        addNextMessage();
    }

    lucide.createIcons();
}

function stopDebate() {
    if (confirm('정말로 토론을 종료하시겠습니까?')) {
        if (debateState.intervalId) {
            clearTimeout(debateState.intervalId);
        }
        debateState.isRunning = false;
        debateState.wasStopped = true;
        finishDebateSimulation();
    }
}

function confirmExit() {
    if (confirm('토론을 취소하고 나가시겠습니까?')) {
        if (debateState.intervalId) {
            clearTimeout(debateState.intervalId);
        }
        navigateTo('main-screen');
    }
}

function finishDebateSimulation() {
    debateState.isRunning = false;
    debateState.isFinished = true;

    document.getElementById('arena-controls').classList.add('hidden');
    document.getElementById('moderator-panel').classList.add('hidden');
    document.getElementById('complete-btn').classList.remove('hidden');

    if (!debateState.wasStopped) {
        document.getElementById('progress-bar').style.width = '100%';
        updatePhaseIndicator('summary');
    }

    lucide.createIcons();
}

function goToResult() {
    saveDebateToHistory();
    prepareResultScreen();
    navigateTo('result-screen');
}

// ===== Result & Analytics =====
function prepareResultScreen() {
    const resultBadge = document.getElementById('result-badge');
    const resultTitle = document.getElementById('result-title');
    const resultSubtitle = document.getElementById('result-subtitle');

    if (debateState.wasStopped) {
        resultBadge.classList.add('stopped');
        resultBadge.innerHTML = '<i data-lucide="pause-circle" class="trophy-icon"></i>';
        resultTitle.textContent = '토론이 중단되었습니다';
        resultSubtitle.textContent = '중간까지의 토론 내용을 바탕으로 결과를 정리해 드립니다.';
    } else {
        resultBadge.classList.remove('stopped');
        resultBadge.innerHTML = '<i data-lucide="trophy" class="trophy-icon"></i>';
        resultTitle.textContent = '그래서, 결론이 뭡니까?';
        resultSubtitle.textContent = '끌벅적했던 오늘의 난상토론, 사회자가 딱 정리해 드립니다.';
    }

    // Enhanced Summary (2x longer)
    const summaryContent = document.getElementById('summary-content');
    summaryContent.innerHTML = `
        <p>오늘 "<strong>${currentSetup.topic}</strong>" 주제로 ${currentSetup.participants.length}명의 AI 패널이 ${debateState.currentTurn}라운드에 걸쳐 열띤 토론을 진행했습니다.</p>
        <br>
        <p>각 패널은 자신만의 논증 스타일을 살려 치열하게 맞붙었습니다. 냉철한 분석가는 데이터와 통계를 무기로, 뜨거운 인본주의자는 인간의 가치를 역설했습니다. 철저한 실용주의자는 현실성을 따졌고, 급진적 개혁가는 파괴적 혁신을 외쳤습니다.</p>
        <br>
        <p>신중한 보수파는 검증된 것의 가치를 지키려 했고, 악마의 대변인은 모든 주장의 허점을 찔렀습니다. 이처럼 다양한 시각이 충돌하고 교차하면서 우리는 단일한 정답보다 더 풍부한 관점을 얻게 되었습니다.</p>
        <br>
        <p>토론의 가장 큰 가치는 '나와 다른 생각'을 경험하는 것입니다. 동의하지 않더라도, 왜 그렇게 생각하는지 이해하는 것. 그것이 우리를 더 넓은 시야로 이끕니다.</p>
    `;

    // Key Points
    const keyPoints = document.getElementById('key-points');
    keyPoints.innerHTML = `
        <li>데이터 기반 vs 인간 중심의 가치 충돌</li>
        <li>급진적 변화 vs 점진적 개선의 속도 논쟁</li>
        <li>이상적 비전 vs 실현 가능성의 괴리</li>
        <li>다수 의견 vs 비판적 검증의 필요성</li>
    `;

    // Draw Pie Chart with Merged Stats (including percentages)
    drawPieChartWithStats();

    // Sentiment Analysis
    const positiveRatio = 50 + Math.floor(Math.random() * 25);
    const negativeRatio = 100 - positiveRatio;

    document.getElementById('sentiment-positive').style.width = positiveRatio + '%';
    document.getElementById('sentiment-negative').style.width = negativeRatio + '%';
    document.getElementById('positive-percent').textContent = positiveRatio + '%';
    document.getElementById('negative-percent').textContent = negativeRatio + '%';

    // Keywords as Hashtags
    const keywordCloud = document.getElementById('keyword-cloud');
    const keywords = [
        { word: '혁신', size: 'large' },
        { word: '데이터', size: 'large' },
        { word: '변화', size: 'medium' },
        { word: '효율성', size: 'medium' },
        { word: '인간중심', size: 'medium' },
        { word: '리스크', size: 'small' },
        { word: '검증', size: 'small' },
        { word: '미래', size: 'small' },
        { word: '균형', size: 'small' },
        { word: '실행력', size: 'small' }
    ];
    keywordCloud.innerHTML = keywords.map(k =>
        `<span class="hashtag ${k.size}">#${k.word}</span>`
    ).join('');

    setTimeout(() => lucide.createIcons(), 50);
}

function drawPieChartWithStats() {
    const canvas = document.getElementById('participation-chart');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 8;

    // Count messages and characters per participant (AI)
    const participantStats = currentSetup.participants.map(p => {
        const messages = debateState.messages.filter(m => m.author === p.name);
        const charCount = messages.reduce((sum, m) => sum + (m.charCount || 0), 0);
        return {
            name: p.name,
            colorClass: p.colorClass,
            count: messages.length,
            charCount: charCount,
            isHuman: false
        };
    });

    // Add human participant stats if participating
    if (currentSetup.humanParticipation && currentSetup.humanName) {
        const humanMessages = debateState.messages.filter(m => m.author === currentSetup.humanName);
        const humanCharCount = humanMessages.reduce((sum, m) => sum + (m.charCount || 0), 0);
        participantStats.push({
            name: currentSetup.humanName + ' (나)',
            colorClass: 'human',
            count: humanMessages.length,
            charCount: humanCharCount,
            isHuman: true
        });
    }

    const totalMessages = participantStats.reduce((sum, p) => sum + p.count, 0) || 1;
    const totalChars = participantStats.reduce((sum, p) => sum + p.charCount, 0) || 1;

    const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const humanColor = '#22c55e';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pie based on message count
    let startAngle = -Math.PI / 2;

    participantStats.forEach((p, index) => {
        const sliceAngle = (p.count / totalMessages) * 2 * Math.PI;
        const percent = Math.round((p.count / totalMessages) * 100);
        const color = p.isHuman ? humanColor : colors[index % colors.length];

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Draw percentage label on slice
        if (percent > 10) {
            const midAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + (radius * 0.7) * Math.cos(midAngle);
            const labelY = centerY + (radius * 0.7) * Math.sin(midAngle);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(percent + '%', labelX, labelY);
        }

        startAngle += sliceAngle;
    });

    // Draw center circle (donut effect)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.45, 0, 2 * Math.PI);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-tertiary').trim() || '#f1f3f9';
    ctx.fill();

    // Stats with chart (merged) - including character count and percentage
    const chartStats = document.getElementById('chart-stats');
    chartStats.innerHTML = participantStats.map((p, index) => {
        const percent = Math.round((p.count / totalMessages) * 100);
        const color = p.isHuman ? humanColor : colors[index % colors.length];
        return `
        <div class="stat-row">
            <span class="stat-color" style="background: ${color}"></span>
            <span class="stat-row-name">${p.name}</span>
            <span class="stat-row-value">${percent}% (${p.charCount}자)</span>
        </div>
    `}).join('');
}

function saveDebateToHistory() {
    const debate = {
        id: Date.now().toString(),
        topic: currentSetup.topic,
        createdAt: Date.now(),
        messages: debateState.messages,
        participants: currentSetup.participants,
        wasCompleted: !debateState.wasStopped,
        turns: debateState.currentTurn
    };

    const debates = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBATES) || '[]');
    debates.unshift(debate);

    if (debates.length > 20) {
        debates.pop();
    }

    localStorage.setItem(STORAGE_KEYS.DEBATES, JSON.stringify(debates));
}

function loadDebateHistory() {
    const debates = JSON.parse(localStorage.getItem(STORAGE_KEYS.DEBATES) || '[]');
    const container = document.getElementById('history-list');
    const emptyState = document.getElementById('empty-history');

    container.innerHTML = '';

    if (debates.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    debates.slice(0, 5).forEach(debate => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.onclick = () => viewDebate(debate.id);

        const date = new Date(debate.createdAt);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;

        item.innerHTML = `
            <span class="history-title">${truncateText(debate.topic, 28)}</span>
            <span class="history-date">${dateStr}</span>
        `;

        container.appendChild(item);
    });
}

function truncateText(text, maxLength) {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

function viewDebate(id) {
    alert('토론 상세 보기 기능은 준비 중입니다.');
}

// ===== Share Debate =====
function shareDebate() {
    const shareText = `왈가왈부에서 토론한 주제: "${currentSetup.topic}"\n\n${currentSetup.participants.map(p => `- ${p.name} (${p.job})`).join('\n')}\n\n#왈가왈부 #AI토론`;

    if (navigator.share) {
        navigator.share({
            title: '왈가왈부 - AI 토론 결과',
            text: shareText
        }).catch(() => { });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert('토론 내용이 클립보드에 복사되었습니다!');
        });
    }
}

function downloadDebate() {
    const content = debateState.messages.map(m => `[${m.author}]\n${m.content}\n`).join('\n');
    const blob = new Blob([`왈가왈부 - 토론 기록\n\n토론 주제: ${currentSetup.topic}\n\n${content}`], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `walgawalbu-debate-${Date.now()}.txt`;
    a.click();

    URL.revokeObjectURL(url);
}

function restartDebate() {
    navigateTo('setup-screen');
}

function goHome() {
    navigateTo('main-screen');
}

function openFeedback() {
    alert('피드백 기능은 준비 중입니다.');
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadDebateHistory();

    const topicInput = document.getElementById('topic-input');
    if (topicInput && !topicInput.value) {
        topicInput.value = 'AI 코딩기술의 발전이 앞으로의 스타트업 생태계를 어떻게 변화시킬 것인가?';
        updateCounter('topic-input', 'topic-counter', 200);
    }

    lucide.createIcons();

    console.log('왈가왈부 v0.1.0-beta Loaded!');
});

// ===== Expose functions to window for inline onclick handlers =====
window.toggleTheme = toggleTheme;
window.navigateTo = navigateTo;
window.updateCounter = updateCounter;
window.updateTurnDisplay = updateTurnDisplay;
window.saveSetupAndNext = saveSetupAndNext;
window.toggleHumanParticipation = toggleHumanParticipation;
window.changeParticipantCount = changeParticipantCount;
window.randomizeParticipants = randomizeParticipants;
window.startDebate = startDebate;
window.toggleModeratorPanel = toggleModeratorPanel;
window.closeModeratorPanel = closeModeratorPanel;
window.sendIntervention = sendIntervention;
window.submitHumanInput = submitHumanInput;
window.togglePause = togglePause;
window.stopDebate = stopDebate;
window.confirmExit = confirmExit;
window.goToResult = goToResult;
window.shareDebate = shareDebate;
window.downloadDebate = downloadDebate;
window.restartDebate = restartDebate;
window.goHome = goHome;
window.openFeedback = openFeedback;
window.showUsageInfo = showUsageInfo;
window.showHelp = showHelp;
window.closeModal = closeModal;

