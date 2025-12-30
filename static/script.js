const canvas = document.getElementById('pulseCanvas');
const ctx = canvas.getContext('2d');
const bpmDisplay = document.getElementById('bpm-display');
const hrvDisplay = document.getElementById('hrv-display');
const bpDisplay = document.getElementById('bp-display');
const spo2Display = document.getElementById('spo2-display');
const aiContent = document.getElementById('ai-content');

// Audio Context
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.value = currentCondition === 'Tachycardia' ? 880 : (currentCondition === 'Bradycardia' ? 220 : 440);
    gain.gain.value = 0.1;

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.1);
    osc.stop(audioCtx.currentTime + 0.1);
}

// Gamification State
let xp = 0;
let level = 1;
let streak = 0;
let lastCondition = 'Normal';
let xpInterval;

// -- Theme Toggle --
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);

    // Update icon (simple logic)
    const icon = document.getElementById('theme-icon');
    if (newTheme === 'light') {
        icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
    } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
    }
}


// -- Drawing Logic --
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const maxPoints = 800; // Denser pixels for smooth curve
let dataPoints = new Array(maxPoints).fill(0);
let currentCondition = 'Normal';
let canBeep = true;

function draw() {
    // Clear with trail effect? No, clean redraw for sci-fi look
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid (Simulated via code for easy color syncing)
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--panel-border').trim() || '#333';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 50) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
    for (let y = 0; y < canvas.height; y += 50) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
    ctx.stroke();

    // Pulse Line
    ctx.lineWidth = 3;
    const pulseColor = getComputedStyle(document.body).getPropertyValue('--pulse-color').trim();
    const dangerColor = getComputedStyle(document.body).getPropertyValue('--danger-color').trim();

    ctx.strokeStyle = (currentCondition === 'Arrhythmia' || currentCondition === 'Tachycardia') ? dangerColor : pulseColor;

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = ctx.strokeStyle;

    ctx.beginPath();

    const sliceWidth = canvas.width / maxPoints;
    let x = 0;

    for (let i = 0; i < maxPoints; i++) {
        // Smooth scaling
        const val = dataPoints[i];
        const y = canvas.height / 2 - (val * (canvas.height / 3));

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        // Match beep to pulse peak (rough approx check)
        if (data.value > 1.5 && canBeep) {
            playBeep();
            canBeep = false;
        } else if (data.value < 0.5) {
            canBeep = true;
        }

        x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // Reset

    requestAnimationFrame(draw);
}
draw();

// -- Data Stream --
const eventSource = new EventSource('/stream');

eventSource.onmessage = function (e) {
    const data = JSON.parse(e.data);
    console.log("Stream Data:", data); // Debugging

    dataPoints.shift();
    dataPoints.push(data.value);

    // Update Stats
    if (Math.random() > 0.8) { // update less frequently than draw
        bpmDisplay.innerText = Math.round(data.bpm);
        hrvDisplay.innerText = Math.round(data.condition === 'Normal' ? (40 + Math.random() * 20) : (data.condition === 'Arrhythmia' ? (100 + Math.random() * 50) : 30));

        // Sim latency jitter
        document.getElementById('latency-display').innerText = 10 + Math.floor(Math.random() * 15);

        // New Metrics
        if (data.spo2) spo2Display.innerText = data.spo2;
        if (data.bp) bpDisplay.innerText = data.bp;
    }

    if (data.condition !== currentCondition) {
        currentCondition = data.condition;
        highlightButton(currentCondition);
        // Reset streak on bad condition logic if needed
        if (currentCondition !== 'Normal') resetStreak();
    }
};

// -- Gamification Logic --
function updateGamification() {
    if (currentCondition === 'Normal') {
        streak += 0.1; // 100ms tick approx
        xp += 0.5;
    } else {
        // Slower XP in bad state (learning mode?)
        xp += 0.1;
    }

    if (xp >= 100) {
        xp = 0;
        level++;
        // Trigger level up animation?
        const hud = document.querySelector('.hud-bar');
        hud.style.boxShadow = "0 0 30px var(--accent-color)";
        setTimeout(() => hud.style.boxShadow = "none", 500);
    }

    document.getElementById('sim-level').innerText = level;
    document.getElementById('streak-val').innerText = Math.floor(streak) + "s";

    const xpPct = Math.min(100, Math.max(0, xp));
    document.getElementById('xp-bar').style.width = xpPct + "%";
    document.getElementById('xp-text').innerText = Math.floor(xp) + " / 100";
}
setInterval(updateGamification, 100);

function resetStreak() {
    streak = 0;
}


// -- Controls --
function setCondition(condition) {
    fetch('/api/condition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: condition })
    });
}

let scenarioRunning = false;
function toggleScenario() {
    const action = scenarioRunning ? 'stop' : 'start';
    fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action })
    })
        .then(res => res.json())
        .then(data => {
            const btn = document.getElementById('btn-Scenario');
            if (data.status === 'started') {
                scenarioRunning = true;
                btn.innerText = "STOP SCENARIO";
                btn.style.borderColor = "var(--pulse-color)";
                btn.style.color = "var(--pulse-color)";
                btn.style.background = "rgba(63, 185, 80, 0.1)";
            } else {
                scenarioRunning = false;
                btn.innerText = "RUN SCENARIO (DEMO)";
                btn.style.borderColor = "var(--warn-color)";
                btn.style.color = "var(--warn-color)";
                btn.style.background = "rgba(210, 153, 34, 0.1)";
            }
        });
}

function highlightButton(condition) {
    document.querySelectorAll('.controls button').forEach(btn => btn.classList.remove('active'));
    const btn = document.getElementById('btn-' + condition);
    if (btn) btn.classList.add('active');
}

// -- AI Analysis --
function triggerAnalysis() {
    const box = document.getElementById('ai-content');
    box.innerHTML = '<span style="color:var(--accent-color)">CONNECTING TO NEURAL NET...</span>';

    fetch('/api/analyze')
        .then(res => res.json())
        .then(data => {
            box.innerText = "";
            let i = 0;
            const text = data.insight;
            // Typewriter
            function type() {
                if (i < text.length) {
                    box.innerHTML += text.charAt(i);
                    i++;
                    setTimeout(type, 15);
                }
            }
            type();
        })
        .catch(err => {
            box.innerText = "LINK FAILURE: " + err;
        });
}
