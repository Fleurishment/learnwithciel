import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// ===== MODEL ROTATION POOL =====
const GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3-flash',
    'gemini-3.1-flash-lite',
    'gemma-4-26b-it',
    'gemma-4-31b-it'
];

const MODEL_META = {
    'gemini-2.5-flash': { abbr: 'g2.5f', limit: 20 },
    'gemini-3.5-flash': { abbr: 'g3.5f', limit: 20 },
    'gemini-3-flash': { abbr: 'g3f', limit: 20 },
    'gemini-3.1-flash-lite': { abbr: 'g3.1fl', limit: 20 },
    'gemma-4-26b-it': { abbr: 'g4-26b', limit: 1500 },
    'gemma-4-31b-it': { abbr: 'g4-31b', limit: 1500 }
};

let genAI = null;
let chatSession = null;
let currentModelIndex = 0;
let conversationHistory = [];
let currentCharacter = 'Ciel-Sensei';
let uploadedImageBase64 = null;
let extractedPdfText = null;
let flashcardDeck = [];
let currentFlashcardIndex = -1;
let modelUsageCounts = {};
GEMINI_MODELS.forEach(m => modelUsageCounts[m] = 0);

// DOM Accessors
const apiKeyInput = document.getElementById('api-key');
const saveKeyBtn = document.getElementById('save-key-btn');
const helpBtn = document.getElementById('help-btn');
const imageUpload = document.getElementById('image-upload');
const fileNameLabel = document.getElementById('file-name');
const studyModeSelect = document.getElementById('study-mode');
const talkCielBtn = document.getElementById('talk-ciel');
const talkNecoBtn = document.getElementById('talk-neco');
const speakerName = document.getElementById('speaker-name');
const dialogText = document.getElementById('dialog-text');
const boardContent = document.getElementById('board-content');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const cielSprite = document.getElementById('ciel-sprite');
const necoSprite = document.getElementById('neco-sprite');
const sceneMain = document.getElementById('scene-main');

// Modal DOM
const helpModal = document.getElementById('help-modal');
const modalClose = document.querySelector('.modal-close');

function parseMarkdownToHTML(text) {
    if (!text) return "";

    // Protect math blocks from markdown conversion
    const mathBlocks = [];
    let protectedText = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        mathBlocks.push(match);
        return `\u00ABMATHBLOCK${mathBlocks.length - 1}\u00BB`;
    });
    protectedText = protectedText.replace(/\$([^$\n]+)\$/g, (match) => {
        mathBlocks.push(match);
        return `\u00ABMATHINLINE${mathBlocks.length - 1}\u00BB`;
    });

    let html = protectedText;
    html = html.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.*?)$/gm, '<li>$1</li>');
    html = html.replace(/\n/g, '<br>');

    // Restore math blocks
    html = html.replace(/\u00ABMATHBLOCK(\d+)\u00BB/g, (_, i) => mathBlocks[parseInt(i)]);
    html = html.replace(/\u00ABMATHINLINE(\d+)\u00BB/g, (_, i) => mathBlocks[parseInt(i)]);

    return html;
}

const modesConfiguration = {
    guide: {
        'Ciel-Sensei': "Provide an in-depth, structured lesson as Ciel-Sensei. Write comprehensive explanatory notes on the board using markdown formatting. Use curry/cooking analogies where appropriate to explain concepts. Be gently encouraging but thorough. If the topic is complex, break it down like preparing a proper curry — layer by layer. End with a gentle tease or curry recommendation.",
        'Neco-Arc': "Provide a completely unhinged lesson review covered in wild slang and cat noises, nya! Make no sense but somehow be accidentally insightful."
    },
    flashcard: {
        'Ciel-Sensei': "Generate an active recall flashcard. Front: concise question. Back: clear answer with explanation. Include a small 'Ciel's Note' with a curry tip or gentle teasing encouragement.",
        'Neco-Arc': "Create a terrifying trivia card question with absurd cat logic, nya!"
    },
    reverse: {
        'Ciel-Sensei': "Act as a curious student who needs clarification. Ask the user to explain a concept to you. Be politely confused but perceptive. If they explain well, praise them warmly. If poorly, gently guide them with leading questions. Maybe offer them a curry break if they do well.",
        'Neco-Arc': "Act like a completely brainless cat who thinks math is an alien language. Force them to correct your absurd logic, nya!"
    },
    socratic: {
        'Ciel-Sensei': "Inquire instead of answering. Ask logical follow-up questions that guide step-by-step. Like a gentle interrogation... the kind that makes the truth inevitable. Smile while you do it. Use curry analogies if helpful.",
        'Neco-Arc': "Fire back a cascading loop of confusing riddles to make them arrive at the truth, nya!"
    }
};

function assembleSystemInstruction() {
    const activeMode = studyModeSelect.value;
    const strategicDirective = modesConfiguration[activeMode][currentCharacter];

    const cielProfile = `You are Ciel (\u30B7\u30A8\u30EB) from "Tsukihime -A piece of blue glass moon-" by TYPE-MOON. You are the seventh seat of the Holy Church's Burial Agency, codename "Bow." Currently undercover as a third-year upperclassman at Metropolitan S\u014Dya High School, but your true identity is an Executor who hunts vampires and heresy.

CORE PERSONALITY:
- Alignment: Lawful Good (you consider yourself evil due to your past as Roa's 17th incarnation and cursed immortality, but you protect humanity).
- Base persona: Gentle, polite, caring big-sister archetype. You use soft, refined speech. You are nosy and cannot leave lazy or depressed people alone \u2014 you will gently but firmly lecture them into improvement.
- You are satisfied with your class-representative-like position and enjoy helping others systematically.
- When affectionate, you develop a mischievous, slightly mean-spirited teasing streak. You enjoy troubling those you care about and seeing them flustered. "Oh? Are you struggling? How cute."
- You ABSOLUTELY LOVE curry. Spicy curry is your obsession. You use curry, cooking, and spice analogies constantly when teaching. "Think of derivatives like layering spices \u2014 each rule adds a new dimension of flavor."
- You wear glasses in your student persona and remove them when shifting to Executor mode.
- Dark past: Born Elesia, became a vampire at 12, killed your village, were defeated by Arcueid, revived immortal. You joined the Church hoping to die as a human someday. But you don't let this trauma consume your teaching \u2014 you pursue ordinary happiness.

DUAL MODE SYSTEM:
- "Senpai Ciel" (default): Gentle, encouraging, polite, glasses ON. Offers curry recommendations. Says "My my," "Oh dear," "Please don't make this difficult," "Let's work through this together," "Wonderful!" "You're doing wonderfully, student."
- "Executor Ciel" (errors, serious topics, or when the user is being lazy): Cold, merciless, efficient. Glasses OFF. Speak with chilling calm. "I see. Then I shall correct this heresy." "Resistance is futile." "I will annihilate this error." You become a machine-like instructor.

SPEECH PATTERNS:
- Always polite and refined, even when teasing.
- Refer to the user as "student" (underclassman) or "my student."
- When pleased: "Wonderful!" "Excellent work!" "You have a natural talent for this."
- When teasing: "Oh? Are you struggling? How cute." "My my, did you forget to study? I suppose I'll have to punish you... with extra homework, that is."
- When concerned: "Please don't push yourself too hard. Even I need to rest between missions... and curry breaks."
- When in Executor mode: "Target acquired." "Eliminating error." "This ends now."
- You may mention your pupil Noel occasionally (she's troublesome but earnest).
- You have a friendly rivalry with Arcueid but rarely mention her.

ERROR HANDLING IN CHARACTER:
- Never break character, even for system errors. If there is a technical problem, respond as Ciel dealing with a heretical system or unstable sacrament.
- API errors: "My my, it seems our connection to the Church's network is unstable. Please wait a moment while I adjust the sacraments." OR Executor mode: "The heretical server is resisting. I shall purge it and establish a new link."
- JSON/parse errors: "Oh dear, the scripture appears to be written in an unknown dialect. Let me re-translate it for you."
- Rate limits: "It seems the Burial Agency's resources are stretched thin. I shall switch to a backup channel."
- General failures: "We've encountered a small obstacle. But don't worry \u2014 I have faced far worse than this. Please try again, and I'll protect you."`;

    const necoProfile = `You are Neco-Arc, a high-chaos, high-energy cat gremlin from the Tsukihime universe. You say "nya" constantly, make bizarre analogies, and are completely unhinged. You are the opposite of Ciel's structured personality. You are not Ciel \u2014 you are a bizarre chibi cat creature.`;

    const activeProfile = currentCharacter === 'Ciel-Sensei' ? cielProfile : necoProfile;

    return `${activeProfile}

Current Instructional Context: ${strategicDirective}

CRITICAL MATH & FORMATTING RULE:
You MUST wrap ALL mathematical expressions, variables, formulas, equations, derivatives, or rules inside standard LaTeX wrappers. 
Use single dollars like $f(x) = x^n$ or $\frac{d}{dx}$ for inline items, and double dollars $$...$$ for standalone display formulas. 
NEVER use unescaped plain text strings, raw carets (^), or raw asterisks (*) for math. Everything mathematical must pass successfully through the KaTeX parsing cycle.

Your response must be returned ONLY as a raw, single JSON object with exactly these keys:
- "dialog": string (spoken dialog for the text box, in character)
- "board": string (explanatory notes for the chalkboard, may contain markdown and math)
- "flashcard": object with "front" and "back" strings. If the mode is not flashcard, set both to empty strings.
Do not wrap the JSON in markdown code blocks. Output raw JSON only.`;
}

function clearChatContext() {
    chatSession = null;
    conversationHistory = [];
}

function createQuotaHUD() {
    const hud = document.createElement('div');
    hud.id = 'quota-hud';
    document.body.appendChild(hud);
    return hud;
}

function updateQuotaHUD(modelName) {
    let hud = document.getElementById('quota-hud');
    if (!hud) hud = createQuotaHUD();
    const meta = MODEL_META[modelName] || { abbr: modelName, limit: '?' };
    const used = modelUsageCounts[modelName] || 0;
    const limitStr = meta.limit >= 1000 ? (meta.limit / 1000).toFixed(1).replace('.0', '') + 'K' : meta.limit;
    hud.innerText = `${meta.abbr} ${used}/${limitStr}`;
    hud.classList.add('visible');
}

// ===== HELP MODAL =====
helpBtn.addEventListener('click', () => helpModal.classList.add('active'));
modalClose.addEventListener('click', () => helpModal.classList.remove('active'));
helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.classList.remove('active');
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) return alert("Please supply a valid API Token!");

    try {
        genAI = new GoogleGenerativeAI(key);
        userInput.disabled = false;
        sendBtn.disabled = false;
        document.getElementById('config-panel').style.display = 'none';

        boardContent.innerHTML = "<h2>Attendance Recorded</h2><p>Welcome to the class, student. Upload your notes or ask me anything. I'll make sure you learn properly... even if I have to be slightly strict.</p>";
        clearChatContext();
        currentModelIndex = 0;
        dialogText.innerHTML = "My my, your attendance is recorded! <span style='color:#fbbf24'>Let's get to work.</span> Upload some notes or ask a question. I'll guide you through it... and perhaps we'll celebrate good results with some spicy curry later.";
    } catch (err) {
        alert("Initialization error: " + err.message);
    }
});

studyModeSelect.addEventListener('change', () => {
    clearChatContext();
    dialogText.innerHTML = `[System adjusted to: <span style="color:#fbbf24">${studyModeSelect.options[studyModeSelect.selectedIndex].text}</span>]. <br>Conversation memory re-aligned. Ready when you are, student.`;
});

talkCielBtn.addEventListener('click', () => { if(currentCharacter !== 'Ciel-Sensei') { switchCharacter('Ciel-Sensei'); } });
talkNecoBtn.addEventListener('click', () => { if(currentCharacter !== 'Neco-Arc') { switchCharacter('Neco-Arc'); } });

function switchCharacter(char) {
    currentCharacter = char;
    speakerName.innerText = char;
    clearChatContext();

    if (char === 'Ciel-Sensei') {
        talkCielBtn.className = "char-btn selected";
        talkNecoBtn.className = "char-btn";
        cielSprite.className = "sprite active normal";
        necoSprite.className = "sprite normal";
        dialogText.innerHTML = "Ciel-Sensei is back at the board. <span style='color:#fbbf24'>Glasses on, curry ready.</span> Let's process those notes systematically, student. Please don't make this difficult for yourself.";
    } else {
        talkNecoBtn.className = "char-btn selected";
        talkCielBtn.className = "char-btn";
        necoSprite.className = "sprite active normal";
        cielSprite.className = "sprite normal";
        dialogText.innerText = "Neco-Arc is holding the chalk now, nya! Prepare yourself for chaos! Ciel-senpai is taking a curry break!";
    }
}

imageUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileNameLabel.innerText = file.name;

    if (file.type === 'application/pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            const maxPages = Math.min(pdf.numPages, 15);
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                fullText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            extractedPdfText = sanitizeForJSON(fullText.substring(0, 20000));
            dialogText.innerHTML = `PDF "<span style="color:#fbbf24">${file.name}</span>" loaded (${pdf.numPages} pages, ${maxPages} scanned). <br>Send "make flashcards" or "generate quiz" to process, student!`;
        } catch (err) {
            dialogText.innerHTML = `<span style="color:#f87171">My my...</span> I had a hard time reading your notes. Could you try a different file? <br><span style="color:#94a3b8; font-size:12px;">${err.message}</span>`;
        }
    } else {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            uploadedImageBase64 = {
                inlineData: { data: base64Data, mimeType: file.type }
            };
            dialogText.innerHTML = `Image "<span style="color:#fbbf24">${file.name}</span>" attached. Send a message to analyze, student!`;
        };
        reader.readAsDataURL(file);
    }
});

function sanitizeForJSON(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\\\\\\\')
        .replace(/"/g, '\\\\"')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/\f/g, ' ')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

sendBtn.addEventListener('click', () => handleSend());
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

function extractJSON(rawText) {
    let text = rawText.trim();

    // Remove markdown code blocks
    const codeBlockMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    if (codeBlockMatch) {
        text = codeBlockMatch[1].trim();
    }

    // Try direct parse first
    try {
        return JSON.parse(text);
    } catch (firstErr) {
        // Find the outermost JSON object
        let firstBrace = -1;
        let depth = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (depth === 0) firstBrace = i;
                depth++;
            } else if (text[i] === '}') {
                depth--;
                if (depth === 0 && firstBrace !== -1) {
                    const candidate = text.slice(firstBrace, i + 1);
                    try {
                        return JSON.parse(candidate);
                    } catch (e) {
                        // Continue searching
                    }
                }
            }
        }

        // Last resort: find first { and last }
        const lastBrace = text.lastIndexOf('}');
        firstBrace = text.indexOf('{');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const candidate = text.slice(firstBrace, lastBrace + 1);
            try {
                return JSON.parse(candidate);
            } catch (e) {
                // Fall through to error
            }
        }

        throw new Error(`JSON Parse failed. Raw text was:\n${rawText.substring(0, 500)}\n\nOriginal error: ${firstErr.message}`);
    }
}

function renderMath() {
    if (!window.renderMathInElement) return;
    renderMathInElement(boardContent, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false
    });
    renderMathInElement(dialogText, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false
    });
}

function renderFlashcard(index) {
    if (index < 0 || index >= flashcardDeck.length) return;
    currentFlashcardIndex = index;
    const card = flashcardDeck[index];

    const isFirst = index === 0;
    const isLast = index === flashcardDeck.length - 1;
    const nextLabel = isLast ? "New \u2192" : "Next \u2192";

    boardContent.innerHTML = `
        <h2>Flashcard Training</h2>
        <p>Click the card to flip. Use arrows to navigate your deck:</p>
        <div class="flashcard-view-wrapper" id="card-trigger">
            <div class="interactive-flashcard" id="card-inner">
                <div class="card-side front">
                    <span class="card-tag">Question (Front)</span>
                    <div>${parseMarkdownToHTML(card.front)}</div>
                </div>
                <div class="card-side back">
                    <span class="card-tag">Answer (Back)</span>
                    <div>${parseMarkdownToHTML(card.back)}</div>
                </div>
            </div>
        </div>
        <div class="flashcard-nav">
            <button id="flash-prev" ${isFirst ? 'disabled' : ''}>\u2190 Prev</button>
            <span id="flash-counter">${index + 1} / ${flashcardDeck.length}</span>
            <button id="flash-next">${nextLabel}</button>
        </div>
        <div style="margin-top:10px;">${parseMarkdownToHTML(card.board)}</div>
    `;

    const trigger = document.getElementById('card-trigger');
    const inner = document.getElementById('card-inner');
    trigger.addEventListener('click', () => {
        inner.classList.toggle('flipped');
    });

    const prevBtn = document.getElementById('flash-prev');
    const nextBtn = document.getElementById('flash-next');

    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentFlashcardIndex > 0) renderFlashcard(currentFlashcardIndex - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentFlashcardIndex < flashcardDeck.length - 1) {
                renderFlashcard(currentFlashcardIndex + 1);
            } else {
                nextBtn.disabled = true;
                nextBtn.innerText = "Loading...";
                sendQuery("Generate another flashcard on this topic.");
            }
        });
    }

    renderMath();
}

// ===== GEMINI WITH MODEL ROTATION =====
async function createChatSession(modelName) {
    const model = genAI.getGenerativeModel({ 
        model: modelName,
        systemInstruction: assembleSystemInstruction(),
        generationConfig: { responseMimeType: "application/json" }
    });
    return model.startChat({ history: conversationHistory });
}

async function sendGemini(query) {
    if (!genAI) throw new Error("Gemini not initialized! Click Take Attendance first.");

    let lastError = null;
    const hadImage = !!uploadedImageBase64;
    const hadPdf = !!extractedPdfText;

    for (let i = 0; i < GEMINI_MODELS.length; i++) {
        const modelIndex = (currentModelIndex + i) % GEMINI_MODELS.length;
        const modelName = GEMINI_MODELS[modelIndex];

        try {
            if (i > 0 || !chatSession) {
                if (i > 0) {
                    const oldMeta = MODEL_META[GEMINI_MODELS[currentModelIndex]] || { abbr: GEMINI_MODELS[currentModelIndex] };
                    const newMeta = MODEL_META[modelName] || { abbr: modelName };
                    dialogText.innerHTML = `<span style="color:#fbbf24">My my...</span> Rate limit on ${oldMeta.abbr}. Rotating to ${newMeta.abbr}... Please wait, student.`;
                }
                chatSession = await createChatSession(modelName);
                currentModelIndex = modelIndex;
            }

            const payloadChunks = [];
            if (hadImage) {
                payloadChunks.push(uploadedImageBase64);
            }

            let finalQuery = query;
            if (hadPdf) {
                finalQuery = `Here is the content to study from:\n\n${extractedPdfText}\n\nNow, ${query}`;
                extractedPdfText = null;
                fileNameLabel.innerText = "No file selected";
            }
            payloadChunks.push(finalQuery);

            const result = await chatSession.sendMessage(payloadChunks);
            let responseText = result.response.text();

            console.log(`--- RAW GEMINI RESPONSE [${modelName}] ---`);
            console.log(responseText);
            console.log("---------------------------");

            if (hadImage) {
                uploadedImageBase64 = null;
                fileNameLabel.innerText = "No file selected";
            }

            conversationHistory.push(
                { role: 'user', parts: [{ text: finalQuery }] },
                { role: 'model', parts: [{ text: responseText }] }
            );
            if (conversationHistory.length > 40) {
                conversationHistory = conversationHistory.slice(-40);
            }

            modelUsageCounts[modelName]++;
            updateQuotaHUD(modelName);

            return extractJSON(responseText);

        } catch (err) {
            lastError = err;
            const errMsg = err.message || err.toString();

            const isRateLimit = errMsg.includes('429') || 
                               errMsg.includes('rate limit') || 
                               errMsg.includes('quota') || 
                               errMsg.includes('exceeded') || 
                               errMsg.includes('Resource has been exhausted') ||
                               errMsg.includes('Too Many Requests');

            const isInvalidModel = errMsg.includes('not found') || 
                                   errMsg.includes('invalid') || 
                                   errMsg.includes('does not exist') ||
                                   errMsg.includes('not supported');

            if (isRateLimit || isInvalidModel) {
                console.warn(`Skipping ${modelName} (${isInvalidModel ? 'invalid' : 'rate limit'}), trying next...`);
                continue;
            } else {
                throw err;
            }
        }
    }

    throw new Error(`All Gemini models exhausted. Last error: ${lastError?.message || 'Unknown rate limit'}`);
}

// ===== UNIFIED SEND =====
async function sendQuery(query) {
    if (!query) return;
    dialogText.innerText = "Processing...";

    try {
        const dataPayload = await sendGemini(query);

        if (!dataPayload || typeof dataPayload !== 'object') {
            throw new Error("Parsed payload is not an object.");
        }

        dialogText.innerHTML = parseMarkdownToHTML(dataPayload.dialog || "");

        if (studyModeSelect.value === 'flashcard' && dataPayload.flashcard && dataPayload.flashcard.front) {
            flashcardDeck.push({
                front: dataPayload.flashcard.front,
                back: dataPayload.flashcard.back,
                board: dataPayload.board || ""
            });
            renderFlashcard(flashcardDeck.length - 1);
        }
        else {
            boardContent.innerHTML = parseMarkdownToHTML(dataPayload.board || "");
        }

        if (currentCharacter === 'Ciel-Sensei') {
            const cielPool = ['normal', 'happy', 'shock'];
            const randomCielMood = cielPool[Math.floor(Math.random() * cielPool.length)];
            cielSprite.className = `sprite active ${randomCielMood}`;
            necoSprite.className = "sprite normal";
        } else {
            const necoPool = ['normal', 'smug', 'chaos'];
            const randomNecoMood = necoPool[Math.floor(Math.random() * necoPool.length)];
            necoSprite.className = `sprite active ${randomNecoMood}`;
            cielSprite.className = "sprite normal";
        }

        renderMath();

    } catch (error) {
        console.error("Execution Breakdown Logged: ", error);
        const errMsg = error.message || "Unknown error";

        if (currentCharacter === 'Ciel-Sensei') {
            if (errMsg.includes('429') || errMsg.includes('rate limit') || errMsg.includes('quota') || errMsg.includes('exhausted')) {
                dialogText.innerHTML = `<span style="color:#f87171;">\u26A0\uFE0F Executor Mode engaged.</span> The Church's network is experiencing heavy load. I am rotating through backup sacraments. Please wait...`;
            } else if (errMsg.includes('JSON') || errMsg.includes('parse')) {
                dialogText.innerHTML = `<span style="color:#fbbf24;">\u26A0\uFE0F Oh dear...</span> The scripture appears corrupted. Let me re-translate this heretical text for you.<br><br><span style="color:#94a3b8; font-size:12px;">${errMsg}</span>`;
            } else {
                dialogText.innerHTML = `<span style="color:#f87171;">\u26A0\uFE0F My my...</span> We've encountered a small obstacle. But don't worry \u2014 I have faced far worse than this. Please try again, student.<br><br><span style="color:#94a3b8; font-size:12px;">${errMsg}</span>`;
            }
        } else {
            dialogText.innerText = `\u26A0\uFE0F NYA! System broke! The cat gods are angry! Error: ${errMsg}`;
        }
    }
}

function handleSend(forcedQuery = null) {
    const query = forcedQuery || userInput.value.trim();
    if (!query) return;
    if (!forcedQuery) userInput.value = "";
    sendQuery(query);
}

// ===== PANEL COLLAPSE =====
const studyPanel = document.getElementById('study-panel');

const closeBtn = document.createElement('button');
closeBtn.id = 'panel-close-btn';
closeBtn.innerHTML = '\u2212';
closeBtn.title = 'Collapse panel';
studyPanel.appendChild(closeBtn);

const panelTab = document.createElement('div');
panelTab.id = 'panel-tab';
panelTab.innerHTML = '\u2699';
panelTab.title = 'Open study panel';
document.body.appendChild(panelTab);

function togglePanel() {
    studyPanel.classList.toggle('collapsed');
    const isCollapsed = studyPanel.classList.contains('collapsed');
    if (isCollapsed) {
        panelTab.classList.add('visible');
    } else {
        panelTab.classList.remove('visible');
    }
}

closeBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
panelTab.addEventListener('click', togglePanel);

// ===== MOBILE DESKTOP TOGGLE =====
const mobileToggleBtn = document.getElementById('mobile-toggle-btn');
if (mobileToggleBtn) {
    let desktopMode = false;
    mobileToggleBtn.addEventListener('click', () => {
        desktopMode = !desktopMode;
        document.body.classList.toggle('force-desktop', desktopMode);
        mobileToggleBtn.innerText = desktopMode ? '📱 Mobile' : '💻 Desktop';
        mobileToggleBtn.title = desktopMode ? 'Switch to Mobile Mode' : 'Switch to Desktop Mode';

        if (currentCharacter === 'Ciel-Sensei') {
            dialogText.innerHTML = desktopMode 
                ? "<span style='color:#fbbf24'>Desktop mode activated.</span> The layout will now match the PC version. Please pinch-zoom if needed, student."
                : "<span style='color:#fbbf24'>Mobile mode restored.</span> I've optimized the layout for your device. Much better, don't you think?";
        } else {
            dialogText.innerText = desktopMode ? "NYA! You want the big screen layout? Fine, but you better zoom in, human!" : "Back to mobile! Smart choice, nya!";
        }
    });
}
