//该版本：v1.7.3,顺便祝173 99！
const SPECTRAL_TYPE_BY_MASS = {
    'O': { min: 16, max: Infinity, t: 35000, c: '#9bb0ff' },
    'B': { min: 2.1, max: 16, t: 15000, c: '#aabfff' },
    'A': { min: 1.4, max: 2.1, t: 8500, c: '#cad7ff' },
    'F': { min: 1.1, max: 1.4, t: 6500, c: '#f8f7ff' },
    'G': { min: 0.8, max: 1.1, t: 5778, c: '#ffe91f' },
    'K': { min: 0.4, max: 0.8, t: 4500, c: '#ffe2cf' },
    'M': { min: 0.08, max: 0.4, t: 3200, c: '#ffcc6f' },
    'L': { min: 0.05, max: 0.08, t: 1703, c: '#8b4513' },
    'T': { min: 0.03, max: 0.05, t: 855, c: '#8b4513' },
    'Y': { min: 0, max: 0.03, t: 340, c: '#8b4513' }
    //这里本人需要特殊注明：lty不算恒星，而是褐矮星
};
const RANDOM_NEWS = [
    "该恒星表面发生中等规模耀斑",
    "一颗流浪行星进入恒星系，轨道半径约4.32AU",
    "恒星系内两颗小行星碰撞，形成新的小行星带",
    "天文学家观测到该恒星周围出现行星形成盘",
    "该恒星释放高能粒子流，影响系内行星磁场",
    "该恒星质量损失速率小幅上升",
    "恒星系诞生了一颗新的气态巨行星",
    "系外探测器发现该恒星系统存在宜居带行星",
    "该恒星表面温度波动，核心氢燃烧速率变化",
    "该恒星捕获了一颗小型褐矮星，成为双星系统",
    "一个系外文明探测了该恒星系",
    "离该恒星系7.8光年处的两个系外文明发生了战争",
];
let state = {
    version: "1.7.3",
    name: "My_Star",
    notes: "",
    category: "normal",
    metallicity: "mid",
    type: "G", 
    age: 0,
    m0: 1.0,
    mass: 1.0,
    lum: 1.0,
    temp: 5778,
    radius: 1.0,
    realRadius: 1.0,
    detailedType: "G2V",
    stage: 'main',
    ms_life: 10000,
    timer: null,
    lastNewsCheck: 0,
    isTechnetium: false,
    isCarbonStar: false,
    isBSS_Reborn: false
};

function autoSetSpectralType() {
    const mass = parseFloat(document.getElementById('initial-mass').value) || 1.0;
    for (const [type, config] of Object.entries(SPECTRAL_TYPE_BY_MASS)) {
        if (mass >= config.min && mass < config.max) {
            state.type = type;
            state.temp = config.t;
            return;
        }
    }
    state.type = "";
    state.temp = 35000;
}

function calculateDetailedSpectralType() {
    if (state.stage === 'remnant') return "D";
    if (state.stage === 'wr') return "W";
    if (state.isCarbonStar) return "C";
    if (state.isTechnetium) return "S";
    if (['L','T','Y'].includes(state.type)) return state.type;
    if (state.m0 == 1.0) return "G2V"; //判断代码老是给太阳搞成G9V，所以直接暴力手段解决，同志们懂吗？
    let subType = 9 - Math.floor(((state.temp - 2000) / 40000) * 10);

    
    let lumClass = "V";
    if (state.stage === 'giant') {
        if (state.lum > 10000) lumClass = "Ia";
        else if (state.lum > 1000) lumClass = "Ib";
        else if (state.lum > 100) lumClass = "III";
        else lumClass = "IV";
    } else if (state.m0 > 15) {
        lumClass = "I";
    }

    return `${state.type}${subType}${lumClass}`;
}

function initNewStar() {
    if(state.timer) { clearInterval(state.timer); state.timer = null; document.getElementById('play-btn').textContent = "播放"; }
    state.version = "1.7.3";
    state.name = document.getElementById('star-name').value;
    state.notes = document.getElementById('star-notes').value;
    state.m0 = parseFloat(document.getElementById('initial-mass').value) || 1.0;
    state.category = document.getElementById('star-category').value;
    state.metallicity = document.getElementById('star-metallicity').value;
    state.isTechnetium = false;
    state.isCarbonStar = false;
    state.isBSS_Reborn = false;
    autoSetSpectralType();
    
    state.mass = state.m0;
    state.age = 0;
    state.lastNewsCheck = 0;
    state.stage = 'main';
    state.radius = 1.0;

    let lifeMult = 1.0;
    let tempMult = 1.0;
    if(state.metallicity === 'low') { lifeMult = 1.15; tempMult = 1.1; }
    if(state.metallicity === 'high') { lifeMult = 0.9; tempMult = 0.95; }

    state.ms_life = (10000 * Math.pow(state.m0, -2.5)) * lifeMult;
    state.temp *= tempMult;

    if (state.category === 'blue_straggler') {
        state.temp *= 1.25;
        state.ms_life *= 1.5;
        logNews(`检测到异常：恒星 ${state.name} 将会成为蓝离散星！`);
    }
    
    document.getElementById('star-visual').classList.remove('exploding');
    updatePhysics();
    updateUI();
    logNews(`恒星/褐矮星 ${state.name} 诞生。`);
    logNews(`当前光谱型：${state.type}`)
}

function updatePhysics() {
    if (state.stage === 'main') {
        let lumZ = state.metallicity === 'low' ? 0.95 : (state.metallicity === 'high' ? 1.1 : 1.0);
        state.lum = Math.pow(state.mass, 3.5) * lumZ;
        if (state.category === 'blue_straggler') state.lum *= 1.4;
        state.temp = state.temp * (1 + (state.age / state.ms_life) * 0.0003);
    }
    state.realRadius = Math.sqrt(state.lum) / Math.pow(state.temp / 5778, 2);
    state.detailedType = calculateDetailedSpectralType();
}

function toggleSim() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
        document.getElementById('play-btn').textContent = "播放";
    } else {
        if(state.stage === 'remnant') return;
        state.timer = setInterval(step, 100);
        document.getElementById('play-btn').textContent = "暂停";
    }
}

function step() {
    const dt = state.ms_life * 0.005; 
    state.age += dt;
    
    let progress = state.age / state.ms_life;
    if (Math.floor(progress * 10) > state.lastNewsCheck) {
        triggerRandomNews();
        state.lastNewsCheck = Math.floor(progress * 10);
    }
    
    if (state.stage === 'main') {
        let lossRate = state.metallicity === 'high' ? 0.00002 : 0.00001;
        state.mass -= (state.m0 * lossRate) * (state.age / (state.ms_life / 10));
        updatePhysics();
        if (state.age >= state.ms_life) {
            if (['K','M','L','T','Y'].includes(state.type)) {
                logNews(`${state.name} 是长寿命的小质量天体，直接进入演化末期。`);
                finishEvolution();
                return;
            }
            state.stage = 'giant';
            logNews(`警告：核心氢枯竭！进入巨星演化阶段。`);
        }
    } else if (state.stage === 'giant' || state.stage === 'wr') {
        if (state.stage === 'giant') {
            let expandRate = state.metallicity === 'high' ? 0.6 : 0.5;
            state.mass -= (state.m0 * 0.005); 
            state.radius += expandRate; 
            state.temp *= 0.98;
            state.lum *= 1.15;

            if (state.category === 'blue_straggler' && state.radius > 25 && !state.isBSS_Reborn) {
                state.isBSS_Reborn = true;
                state.stage = 'main';
                state.age = 0;
                state.m0 = state.mass * 2;
                state.mass = state.m0;
                state.temp = 40000;
                state.radius = 2.0;
                state.ms_life = 10000 * Math.pow(state.m0, -2.5);
                state.type = 'O';
                logNews("蓝离散星发生吞噬合并！重新以O型星身份开始演化周期。");
                return;
            }

            if (state.category === 'carbon') {
                if (state.radius > 5 && !state.isTechnetium && !state.isCarbonStar) {
                    state.isTechnetium = true;
                    logNews("光谱发现s-过程元素锝(Tc)，演化为锝星(S型)。");
                }
                if (state.radius > 12.5 && state.isTechnetium) {
                    state.isTechnetium = false;
                    state.isCarbonStar = true;
                    logNews("恒星已转变为碳星(C型)，大气碳氧比 > 1。");
                }
                if (state.radius > 35) {
                    logNews("碳星进入AGB末期不稳定状态，氦闪烁导致外壳抛射！");
                    finishEvolution(true);
                    return;
                }
            }

            if (state.m0 > 25 && state.radius > 20 && state.category !== 'carbon') {
                state.stage = 'wr';
                state.radius = 5; 
                state.temp = state.metallicity === 'low' ? 70000 : 90000;
                logNews("外壳剥离，演化为WR星（沃尔夫-拉叶星）！");
            }
        } else if (state.stage === 'wr') {
            state.mass -= (state.m0 * 0.015);
            state.temp += 1000; 
            state.lum = Math.pow(state.m0, 4) * 0.5;
            state.radius *= 0.98;
            if (state.mass < state.m0 * 0.3 || state.temp > 150000) {
                logNews("WR星核心引力塌缩开始...");
                finishEvolution(true);
                return;
            }
        }

        updatePhysics();
        const finishRadius = state.m0 >= 8 ? 45 : 35;
        if (state.radius > finishRadius && state.stage !== 'wr') finishEvolution();
    }
    
    updateUI();
}

function finishEvolution(forceSupernova = false) {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
    }
    document.getElementById('play-btn').textContent = "播放";
    document.getElementById('star-visual').classList.add('exploding');
    setTimeout(() => {
        state.stage = 'remnant';
        document.getElementById('star-visual').classList.remove('exploding');
        
        if (forceSupernova || state.m0 > 8) {
            if (state.m0 > 25) {
                state.mass = Infinity ; state.temp = 0 ; state.lum = 0; state.radius = 0.01;
                logNews("超新星爆发！残留核心塌缩为黑洞。");
            } else {
                state.temp = 100000; state.lum = 0.1; state.radius = 0.1; state.mass *= 0.1;
                logNews("超新星爆发！形成中子星。");
            }
        } else {
            state.temp = 30000; state.lum = 0.01; state.radius = 0.2; state.mass *= 0.6;
            logNews("外壳散去，形成白矮星。");
        }
        updatePhysics();
        updateUI();
    }, 2000);
}

function saveToNOPQ() {
    state.notes = document.getElementById('star-notes').value;
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${state.name}.nopq`;
    link.click();
}

function loadFromNOPQ(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            state = JSON.parse(e.target.result);
            state.timer = null;
            document.getElementById('play-btn').textContent = "播放";
            document.getElementById('star-name').value = state.name;
            document.getElementById('initial-mass').value = state.m0;
            document.getElementById('star-category').value = state.category;
            document.getElementById('star-metallicity').value = state.metallicity;
            updateUI();
            logNews(`载入恒星数据：${state.name}`);
        } catch(err) { alert("文件格式有误！"); }
    };
    reader.readAsText(file);
}

function updateUI() {
    document.getElementById('v-mass').textContent = isFinite(state.mass) ? state.mass.toFixed(3) : "M > ∞";
    document.getElementById('v-lum').textContent = state.lum.toFixed(2);
    document.getElementById('v-temp').textContent = Math.round(state.temp);
    document.getElementById('v-time').textContent = state.age.toFixed(1);
    document.getElementById('v-real-radius').textContent = state.realRadius.toFixed(3);
    document.getElementById('v-detailed-spectral').textContent = state.detailedType;
    
    const visual = document.getElementById('star-visual');
    let color = getTempColor(state.temp);
    
    if (state.category === 'carbon' && state.stage === 'giant') {
        color = state.isCarbonStar ? '#ff2200' : '#ff6622'; 
    }
    if (state.stage === 'wr') color = '#99ccff';

    let sizeBase = (state.m0 >=8 || state.category === 'carbon') && state.stage === 'giant' ? 60 : 40;
    let size = state.stage === 'remnant' ? 15 : sizeBase + (state.radius * 2);
    
    visual.style.backgroundColor = color;
    visual.style.width = size + 'px';
    visual.style.height = size + 'px';
    visual.style.boxShadow = `0 0 ${size/1.5}px ${color}`;
    
    let stageDisplay = '';
    const stageNames = { 'main': '主序星', 'giant': '红巨星/超巨星', 'wr': '沃尔夫-拉叶星', 'remnant': '演化残骸' };
    stageDisplay = stageNames[state.stage];
    
    if (state.category === 'carbon' && state.stage === 'giant') {
        if (state.isCarbonStar) stageDisplay = '碳星 (C型)';
        else if (state.isTechnetium) stageDisplay = '锝星 (S型)';
    }

    document.getElementById('star-status-text').textContent = `${state.name} | ${stageDisplay}`;
}

function getTempColor(t) {
    if (t > 25000) return '#9bb0ff';
    if (t > 10000) return '#cad7ff';
    if (t > 5500) return '#ffe91f';
    if (t > 3500) return '#ffcc6f';
    return '#ff5500';
}

function logNews(msg) {
    const container = document.getElementById('news-container');
    const div = document.createElement('div');
    div.className = 'news-item';
    div.innerHTML = `<span style="color:#888">[T+${state.age.toFixed(0)}]</span> ${msg}`;
    container.prepend(div);
}

function triggerRandomNews() {
    const msg = RANDOM_NEWS[Math.floor(Math.random() * RANDOM_NEWS.length)];
    logNews(`[新闻] ${msg}`);
}
//SFCORE牛逼！！！