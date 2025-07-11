// ========================
// GAME STATE & INITIALIZATION
// ========================

const gameState = {
    teams: [],
    currentTeamIndex: 0,
    currentMode: null,
    currentRound: 1,
    scores: {},
    usedWords: [],
    currentWord: '',
    currentRiddle: '',
    guesses: 0,
    timer: null,
    timeLeft: 0,
    revealedLetters: 0,
    showHint: false,
    lastGuessCorrect: null,
    timedWords: [],
    currentTimedWordIndex: 0,
    hintLevel: 0
};

const elements = {
    setupScreen: document.getElementById('setup-screen'),
    nameEntryScreen: document.getElementById('name-entry-screen'),
    teamNameInputs: document.getElementById('team-name-inputs'),
    startGameBtn: document.getElementById('start-game-btn'),
    scoreBar: document.getElementById('score-bar'),
    introScreen: document.getElementById('intro-screen'),
    introContent: document.querySelector('.intro-content'),
    normalGameScreen: document.getElementById('normal-game-screen'),
    riddleGameScreen: document.getElementById('riddle-game-screen'),
    timedGameScreen: document.getElementById('timed-game-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    finalScores: document.getElementById('final-scores')
};

let normalWords = [];
let riddleWords = [];

// ========================
// CORE FUNCTIONS
// ========================

function init() {{
    fetch('words/normal.json')
        .then(response => response.json())
        .then(data => normalWords = data)
        .catch(() => normalWords = ["APPLE", "BEACH", "CRANE", "DANCE", "EAGLE"]);

    fetch('words/riddle.json')
        .then(response => response.json())
        .then(data => riddleWords = data)
        .catch(() => riddleWords = [
            { riddle: "I have keys but no locks...", answer: "keyboard" },
            { riddle: "This item moves but...", answer: "clock" }
        ]);
elements.startGameBtn.addEventListener('click', startGame);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
    
    // Fix: Directly target the intro continue button
    document.getElementById('intro-continue-btn').addEventListener('click', startNextMode);
}

    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', () => setupTeamNameEntry(parseInt(btn.dataset.teams)));
    });

    elements.startGameBtn.addEventListener('click', startGame);
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
    document.querySelectorAll('.continue-btn').forEach(btn => {
        btn.addEventListener('click', startNextMode);
    });
}

// ========================
// GAME FLOW CONTROL
// ========================

function setupTeamNameEntry(numTeams) {
    elements.setupScreen.classList.add('hidden');
    elements.nameEntryScreen.classList.remove('hidden');
    elements.teamNameInputs.innerHTML = '';

    for (let i = 1; i <= numTeams; i++) {
        const div = document.createElement('div');
        div.className = 'team-input';
        div.innerHTML = `
            <label>Team ${i} Name: </label>
            <input type="text" class="team-name-input" required>
        `;
        elements.teamNameInputs.appendChild(div);
    }
}

function startGame() {
    gameState.teams = Array.from(document.querySelectorAll('.team-name-input'))
        .map(input => input.value.trim() || `Team ${Math.random().toString(36).substring(2, 5)}`);

    gameState.teams.forEach(team => gameState.scores[team] = 0);
    updateScoreBar();
    elements.scoreBar.classList.remove('hidden');
    elements.nameEntryScreen.classList.add('hidden');
    gameState.currentMode = null;
    gameState.currentRound = 1;
    showModeIntro('normal');
}

function showModeIntro(mode) {
    elements.introScreen.classList.remove('hidden');
    let introText = '';
    let nextAction = '';

    switch(mode) {
        case 'normal':
            introText = `
                <h2>Normal Mode</h2>
                <p>Guess the 5-letter word in 6 attempts.</p>
                <div class="color-key">
                    <div><span class="correct">Green</span>: Correct letter & position</div>
                    <div><span class="present">Yellow</span>: Correct letter, wrong position</div>
                    <div><span class="absent">Gray</span>: Letter not in word</div>
                </div>
                <p>+50 points per correct guess</p>
            `;
            nextAction = 'Start Normal Mode';
            break;
            
        case 'riddle':
            introText = `
                <h2>Riddle Mode</h2>
                <p>Solve riddles with words (5-9 letters).</p>
                <p>Letters reveal every 7 seconds.</p>
                <p><strong>Scoring:</strong></p>
                <ul>
                    <li>Before letters: 200 points</li>
                    <li>After 1 letter: 150 points</li>
                    <li>After 2 letters: 100 points</li>
                    <li>3+ letters: 50 points</li>
                    <li>Wrong guess: -25 points</li>
                </ul>
            `;
            nextAction = 'Start Riddle Mode';
            break;
            
        case 'timed':
            introText = `
                <h2>Timed Mode</h2>
                <p>5 words, 30 seconds each!</p>
                <p>3 guesses per word.</p>
                <p><strong>Scoring:</strong></p>
                <ul>
                    <li>Correct guess: +100 points</li>
                    <li>All wrong: -50 points</li>
                </ul>
            `;
            nextAction = 'Start Timed Mode';
            break;
    }

    elements.introContent.innerHTML = introText;
    document.querySelector('.continue-btn').textContent = nextAction;
}

function startNextMode() {
    elements.introScreen.classList.add('hidden');
    
    // Updated mode order: Normal → Riddle → Timed
    if (!gameState.currentMode) {
        gameState.currentMode = 'normal';
    } else if (gameState.currentMode === 'normal') {
        gameState.currentMode = 'riddle';
    } else if (gameState.currentMode === 'riddle') {
        gameState.currentMode = 'timed';
    } else {
        endGame();
        return;
    }

    switch(gameState.currentMode) {
        case 'normal': setupNormalMode(); break;
        case 'riddle': setupRiddleMode(); break;
        case 'timed': setupTimedMode(); break;
    }
}

// ========================
// GAME MODES
// ========================

function setupNormalMode() {
    elements.normalGameScreen.classList.remove('hidden');
    const availableWords = normalWords.filter(word => !gameState.usedWords.includes(word));
    gameState.currentWord = availableWords[Math.floor(Math.random() * availableWords.length)].toUpperCase();
    gameState.usedWords.push(gameState.currentWord);
    gameState.guesses = 0;

    elements.normalGameScreen.innerHTML = `
        <div class="current-team">Team: ${gameState.teams[gameState.currentTeamIndex]}</div>
        <div class="game-board"></div>
        <div class="input-area">
            <input type="text" class="word-input" maxlength="5" pattern="[A-Za-z]{5}" required>
            <button class="submit-btn">Submit</button>
        </div>
    `;

    const board = document.querySelector('.game-board');
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'word-row';
        row.dataset.guess = i;
        for (let j = 0; j < 5; j++) {
            const box = document.createElement('div');
            box.className = 'letter-box';
            box.dataset.position = j;
            row.appendChild(box);
        }
        board.appendChild(row);
    }

    document.querySelector('.submit-btn').addEventListener('click', processNormalGuess);
    document.querySelector('.word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processNormalGuess();
    });
}

function processNormalGuess() {
    const input = document.querySelector('.word-input');
    const guess = input.value.toUpperCase();
    if (guess.length !== 5) {
        showTemporaryMessage("Please enter a 5-letter word", "error");
        return;
    }

    const row = document.querySelector(`.word-row[data-guess="${gameState.guesses}"]`);
    const word = gameState.currentWord;

    for (let i = 0; i < 5; i++) {
        const box = row.querySelector(`[data-position="${i}"]`);
        box.textContent = guess[i];
        if (guess[i] === word[i]) {
            box.classList.add('correct');
        } else if (word.includes(guess[i])) {
            box.classList.add('present');
        } else {
            box.classList.add('absent');
        }
    }

    gameState.guesses++;
    input.value = '';

    if (guess === word) {
        gameState.scores[gameState.teams[gameState.currentTeamIndex]] += 50;
        updateScoreBar();
        addGuessFeedback(true);
        setTimeout(() => endNormalRound(true), 1000);
    } else if (gameState.guesses >= 6) {
        addGuessFeedback(false);
        setTimeout(() => endNormalRound(false), 1000);
    }
}

function setupRiddleMode() {
    elements.riddleGameScreen.classList.remove('hidden');
    const riddle = riddleWords[Math.floor(Math.random() * riddleWords.length)];
    gameState.currentRiddle = riddle.riddle;
    gameState.currentWord = riddle.answer.toUpperCase();
    gameState.revealedLetters = 0;
    gameState.guesses = 0;

    elements.riddleGameScreen.innerHTML = `
        <div class="current-team">Team: ${gameState.teams[gameState.currentTeamIndex]}</div>
        <div class="riddle-container">
            <div class="riddle-text">${gameState.currentRiddle}</div>
            <div class="letter-reveal">${'_ '.repeat(gameState.currentWord.length).trim()}</div>
        </div>
        <div class="timer">60</div>
        <div class="input-area">
            <input type="text" class="word-input" required>
            <button class="submit-btn">Submit</button>
        </div>
    `;

    document.querySelector('.submit-btn').addEventListener('click', processRiddleGuess);
    document.querySelector('.word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processRiddleGuess();
    });

    startTimer(60, () => endRiddleRound(false));
    gameState.letterInterval = setInterval(revealNextLetter, 7000);
}

function processRiddleGuess() {
    const input = document.querySelector('.word-input');
    const guess = input.value.toUpperCase();
    if (!guess) return;

    gameState.guesses++;
    const isCorrect = guess === gameState.currentWord;
    addGuessFeedback(isCorrect);

    if (isCorrect) {
        clearInterval(gameState.letterInterval);
        clearTimeout(gameState.timer);
        const lettersRevealed = document.querySelector('.letter-reveal').textContent.split('_').length - 1;
        let points = 0;
        
        if (lettersRevealed === 0) points = 200;
        else if (lettersRevealed === 1) points = 150;
        else if (lettersRevealed === 2) points = 100;
        else points = 50;
        
        gameState.scores[gameState.teams[gameState.currentTeamIndex]] += points;
        updateScoreBar();
        setTimeout(() => endRiddleRound(true), 1500);
    } else {
        gameState.scores[gameState.teams[gameState.currentTeamIndex]] -= 25;
        updateScoreBar();
        input.value = '';
    }
}

function setupTimedMode() {
    elements.timedGameScreen.classList.remove('hidden');
    const availableWords = normalWords.filter(word => !gameState.usedWords.includes(word));
    gameState.timedWords = [];
    for (let i = 0; i < 5; i++) {
        const word = availableWords[Math.floor(Math.random() * availableWords.length)].toUpperCase();
        gameState.timedWords.push(word);
        gameState.usedWords.push(word);
    }
    gameState.currentTimedWordIndex = 0;
    gameState.currentWord = gameState.timedWords[0];
    gameState.guesses = 0;
    gameState.hintLevel = 0;

    elements.timedGameScreen.innerHTML = `
        <div class="current-team">Team: ${gameState.teams[gameState.currentTeamIndex]}</div>
        <div class="word-progress">Word 1 of 5</div>
        <div class="hint-area"></div>
        <div class="timer">30</div>
        <div class="input-area">
            <input type="text" class="word-input" maxlength="5" pattern="[A-Za-z]{5}" required>
            <button class="submit-btn">Submit</button>
        </div>
    `;

    document.querySelector('.submit-btn').addEventListener('click', processTimedGuess);
    document.querySelector('.word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') processTimedGuess();
    });

    startTimer(30, () => {
        if (gameState.guesses < 3) {
            gameState.scores[gameState.teams[gameState.currentTeamIndex]] -= 50;
            updateScoreBar();
            markTeamFailed(gameState.teams[gameState.currentTeamIndex]);
        }
        nextTimedWord();
    });
}

// ========================
// UTILITY FUNCTIONS
// ========================

function updateScoreBar() {
    elements.scoreBar.innerHTML = gameState.teams.map((team, index) => `
        <div class="team-score ${index === gameState.currentTeamIndex ? 'selected' : ''}" 
             data-team="${index}">
            👥 ${team}: ${gameState.scores[team]}
        </div>
    `).join('');

    document.querySelectorAll('.team-score').forEach(teamEl => {
        teamEl.addEventListener('click', () => {
            if (gameState.currentMode === 'timed' || gameState.currentMode === 'riddle') {
                clearTimeout(gameState.timer);
                if (gameState.letterInterval) clearInterval(gameState.letterInterval);
            }
            gameState.currentTeamIndex = parseInt(teamEl.dataset.team);
            updateScoreBar();
            showTemporaryMessage(`Switched to ${gameState.teams[gameState.currentTeamIndex]}`, "success");
        });
    });
}

function addGuessFeedback(isCorrect) {
    const feedback = document.createElement('span');
    feedback.className = `guess-feedback ${isCorrect ? 'correct-guess' : 'wrong-guess'}`;
    feedback.textContent = isCorrect ? '✓' : '✗';
    document.querySelector('.submit-btn').insertAdjacentElement('afterend', feedback);
    setTimeout(() => feedback.remove(), 2000);
}

function startTimer(seconds, callback) {
    clearTimeout(gameState.timer);
    gameState.timeLeft = seconds;
    const timerElement = document.querySelector('.timer');
    if (timerElement) timerElement.textContent = seconds;

    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        if (timerElement) timerElement.textContent = gameState.timeLeft;
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            callback();
        }
    }, 1000);
}

// ========================
// INITIALIZATION
// ========================

window.addEventListener('DOMContentLoaded', init);
