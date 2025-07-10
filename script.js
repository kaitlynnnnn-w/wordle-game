// Game state
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
    revealedLetters: 0
};

// DOM elements
const elements = {
    setupScreen: document.getElementById('setup-screen'),
    nameEntryScreen: document.getElementById('name-entry-screen'),
    teamNameInputs: document.getElementById('team-name-inputs'),
    startGameBtn: document.getElementById('start-game-btn'),
    scoreBar: document.getElementById('score-bar'),
    introScreen: document.getElementById('intro-screen'),
    introContent: document.querySelector('.intro-content'),
    normalGameScreen: document.getElementById('normal-game-screen'),
    timedGameScreen: document.getElementById('timed-game-screen'),
    riddleGameScreen: document.getElementById('riddle-game-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    finalScores: document.getElementById('final-scores')
};

// Word databases (loaded from JSON files)
let normalWords = [];
let riddleWords = [];

// Initialize the game
function init() {
    // Load word databases
    fetch('words/normal.json')
        .then(response => response.json())
        .then(data => normalWords = data);
    
    fetch('words/riddle.json')
        .then(response => response.json())
        .then(data => riddleWords = data);
    
    // Set up team selection buttons
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const numTeams = parseInt(btn.dataset.teams);
            setupTeamNameEntry(numTeams);
        });
    });
    
    // Set up start game button
    elements.startGameBtn.addEventListener('click', startGame);
    
    // Set up continue buttons
    document.querySelectorAll('.continue-btn').forEach(btn => {
        btn.addEventListener('click', startNextMode);
    });
    
    // Set up play again button
    document.getElementById('play-again-btn').addEventListener('click', resetGame);
}

// Set up team name entry screen
function setupTeamNameEntry(numTeams) {
    elements.setupScreen.classList.add('hidden');
    elements.nameEntryScreen.classList.remove('hidden');
    
    elements.teamNameInputs.innerHTML = '';
    
    for (let i = 1; i <= numTeams; i++) {
        const div = document.createElement('div');
        div.className = 'team-input';
        
        const label = document.createElement('label');
        label.textContent = `Team ${i} Name: `;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'team-name-input';
        input.required = true;
        
        div.appendChild(label);
        div.appendChild(input);
        elements.teamNameInputs.appendChild(div);
    }
}

// Start the game with entered team names
function startGame() {
    const nameInputs = document.querySelectorAll('.team-name-input');
    gameState.teams = Array.from(nameInputs).map(input => input.value.trim());

    document.querySelector('.continue-btn').addEventListener('click', startNextMode);
    
    // Initialize scores
    gameState.teams.forEach(team => {
        gameState.scores[team] = 0;
    });
    
    // Set up score bar
    updateScoreBar();
    elements.scoreBar.classList.remove('hidden');
    
    // Start with normal mode
    gameState.currentMode = 'normal';
    showModeIntro('normal');
}

// Show introduction for the current game mode
function showModeIntro(mode) {
    elements.introScreen.classList.remove('hidden');
    
    let introText = '';
    let nextAction = '';
    
    switch(mode) {
        case 'normal':
            introText = `
                <h2>Normal Mode</h2>
                <p>Each team will have 5 rounds to guess 5-letter words.</p>
                <p>You'll have 6 attempts per word:</p>
                <ul>
                    <li><span class="correct">Green</span>: Correct letter in correct position</li>
                    <li><span class="present">Yellow</span>: Correct letter in wrong position</li>
                    <li><span class="absent">Grey</span>: Letter not in word</li>
                </ul>
                <p>Each correct guess earns 50 points.</p>
            `;
            nextAction = 'Start Normal Mode';
            break;
            
        case 'timed':
            introText = `
                <h2>Timed Mode</h2>
                <p>5 words to guess, 30 seconds per word.</p>
                <p>Each team gets 3 guesses per word.</p>
                <p>If all guesses are wrong, the team icon turns grey for that word.</p>
                <p>Hints will appear after guesses:</p>
                <ul>
                    <li>After 1 wrong guess: Letter count hint</li>
                    <li>After 2 wrong guesses: Starting letter hint</li>
                    <li>After 3 wrong guesses: Category hint</li>
                </ul>
                <p>Scoring:</p>
                <ul>
                    <li>Correct guess: 100 points</li>
                    <li>All guesses wrong: -50 points</li>
                </ul>
            `;
            nextAction = 'Start Timed Mode';
            break;
            
        case 'riddle':
            introText = `
                <h2>Riddle Mode</h2>
                <p>Solve riddles with words from 5-9 letters (may contain spaces).</p>
                <p>1 minute timer per riddle.</p>
                <p>Letters reveal every 7 seconds.</p>
                <p>Scoring:</p>
                <ul>
                    <li>Before any letters: 200 points</li>
                    <li>After 1 letter: 150 points</li>
                    <li>After 2 letters: 100 points</li>
                    <li>After 3+ letters: 50 points</li>
                    <li>Wrong guess: -25 points</li>
                </ul>
            `;
            nextAction = 'Start Riddle Mode';
            break;
    }
    
    elements.introContent.innerHTML = introText;
    document.querySelector('.continue-btn').textContent = nextAction;
}

// Start the actual game mode
function startNextMode() {
    elements.introScreen.classList.add('hidden');
    
    switch(gameState.currentMode) {
        case 'normal':
            setupNormalMode();
            break;
        case 'timed':
            setupTimedMode();
            break;
        case 'riddle':
            setupRiddleMode();
            break;
    }
}

// Set up normal Wordle-style mode
function setupNormalMode() {
    elements.normalGameScreen.classList.remove('hidden');
    
    // Select a random word that hasn't been used yet
    const availableWords = normalWords.filter(word => !gameState.usedWords.includes(word));
    gameState.currentWord = availableWords[Math.floor(Math.random() * availableWords.length)].toUpperCase();
    gameState.usedWords.push(gameState.currentWord);
    gameState.guesses = 0;
    
    // Set up the game board
    const board = document.createElement('div');
    board.className = 'game-board';
    
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
    
    elements.normalGameScreen.innerHTML = '';
    elements.normalGameScreen.appendChild(board);
    
    // Set up input area
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'word-input';
    input.maxLength = 5;
    input.pattern = '[A-Za-z]{5}';
    input.required = true;
    
    const submit = document.createElement('button');
    submit.className = 'submit-btn';
    submit.textContent = 'Submit';
    submit.addEventListener('click', processNormalGuess);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processNormalGuess();
        }
    });
    
    inputArea.appendChild(input);
    inputArea.appendChild(submit);
    elements.normalGameScreen.appendChild(inputArea);
    
    // Display current team
    const teamDisplay = document.createElement('div');
    teamDisplay.className = 'current-team';
    teamDisplay.textContent = `Current Team: ${gameState.teams[gameState.currentTeamIndex]}`;
    elements.normalGameScreen.prepend(teamDisplay);
}

// Process a guess in normal mode
function processNormalGuess() {
    const input = document.querySelector('.word-input');
    const guess = input.value.toUpperCase();
    
    if (guess.length !== 5) {
        alert('Please enter a 5-letter word');
        return;
    }
    
    // Mark the letters
    const currentRow = document.querySelector(`.word-row[data-guess="${gameState.guesses}"]`);
    const word = gameState.currentWord;
    
    for (let i = 0; i < 5; i++) {
        const box = currentRow.querySelector(`[data-position="${i}"]`);
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
    
    // Check for win or loss
    if (guess === word) {
        // Correct guess - add points
        gameState.scores[gameState.teams[gameState.currentTeamIndex]] += 50;
        updateScoreBar();
        
        setTimeout(() => {
            endNormalRound(true);
        }, 1000);
    } else if (gameState.guesses >= 6) {
        // Out of guesses
        setTimeout(() => {
            endNormalRound(false);
        }, 1000);
    }
}

// End a round in normal mode
function endNormalRound(success) {
    elements.normalGameScreen.classList.add('hidden');
    
    // Show result
    const result = document.createElement('div');
    result.className = 'result';
    result.innerHTML = success ? 
        `<p>Correct! The word was ${gameState.currentWord}. +50 points!</p>` :
        `<p>Out of guesses! The word was ${gameState.currentWord}. No points.</p>`;
    
    elements.normalGameScreen.appendChild(result);
    
    // Move to next team or next mode
    gameState.currentTeamIndex++;
    gameState.currentRound++;
    
    if (gameState.currentTeamIndex >= gameState.teams.length) {
        gameState.currentTeamIndex = 0;
        
        if (gameState.currentRound > 5) {
            // Move to next mode
            gameState.currentMode = 'timed';
            gameState.currentRound = 1;
            showModeIntro('timed');
        } else {
            // Next round
            setupNormalMode();
        }
    } else {
        // Next team
        setupNormalMode();
    }
}

// Set up timed mode
function setupTimedMode() {
    elements.timedGameScreen.classList.remove('hidden');
    
    // Select 5 random words
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
    
    // Set up UI
    elements.timedGameScreen.innerHTML = `
        <div class="word-display"></div>
        <div class="hint-area"></div>
        <div class="timer">30</div>
        <div class="current-team">Current Team: ${gameState.teams[gameState.currentTeamIndex]}</div>
        <div class="input-area">
            <input type="text" class="word-input" maxlength="5" pattern="[A-Za-z]{5}" required>
            <button class="submit-btn">Submit</button>
        </div>
        <div class="word-progress">Word 1 of 5</div>
    `;

    function updateScoreBar() {
  elements.scoreBar.innerHTML = '';
  gameState.teams.forEach((team, index) => {
    const teamScore = document.createElement('div');
    teamScore.className = 'team-score';
    teamScore.innerHTML = `
      👥 ${team}: ${gameState.scores[team]}
    `;
    // Add click handler for team switching
    teamScore.addEventListener('click', () => {
      gameState.currentTeamIndex = index;
      document.querySelectorAll('.team-score').forEach(el => 
        el.classList.remove('selected')
      );
      teamScore.classList.add('selected');
      alert(`Now playing: ${team}`); // Optional confirmation
    });
    elements.scoreBar.appendChild(teamScore);
  });
}
    
    // Start timer
    startTimer(30, () => {
        // Time's up - mark as failed if not guessed
        if (gameState.guesses < 3) {
            const teamName = gameState.teams[gameState.currentTeamIndex];
            gameState.scores[teamName] -= 50;
            updateScoreBar();
            
            // Mark team as failed for this word
            markTeamFailed(teamName);
        }
        
        nextTimedWord();
    });
    
    // Set up submit handler
    document.querySelector('.submit-btn').addEventListener('click', processTimedGuess);
    document.querySelector('.word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processTimedGuess();
        }
    });
}

// Process a guess in timed mode
function processTimedGuess() {
    const input = document.querySelector('.word-input');
    const guess = input.value.toUpperCase();
    
    if (guess.length !== 5) {
        alert('Please enter a 5-letter word');
        return;
    }
    
    gameState.guesses++;
    
    if (guess === gameState.currentWord) {
        // Correct guess
        clearTimeout(gameState.timer);
        const teamName = gameState.teams[gameState.currentTeamIndex];
        gameState.scores[teamName] += 100;
        updateScoreBar();
        
        // Show success message
        const wordDisplay = document.querySelector('.word-display');
        wordDisplay.innerHTML = `
            <div class="correct-word">${gameState.currentWord}</div>
            <div class="success-message">Correct! +100 points!</div>
        `;
        
        setTimeout(() => {
            nextTimedWord();
        }, 2000);
    } else {
        // Wrong guess
        input.value = '';
        gameState.hintLevel++;
        updateHint();
        
        if (gameState.guesses >= 3) {
            // Out of guesses
            clearTimeout(gameState.timer);
            const teamName = gameState.teams[gameState.currentTeamIndex];
            gameState.scores[teamName] -= 50;
            updateScoreBar();
            
            // Mark team as failed for this word
            markTeamFailed(teamName);
            
            setTimeout(() => {
                nextTimedWord();
            }, 2000);
        }
    }
}

function processTimedGuess() {
  // ... (existing code)
  gameState.hintLevel++; // Increment hint level on wrong guess
  updateHint(); // Add this line to trigger hints
}

function updateHint() {
  const hintArea = document.querySelector('.hint-area');
  const word = gameState.currentWord.toLowerCase();
  
  switch(gameState.hintLevel) {
    case 1:
      hintArea.textContent = `Hint: The word contains ${countLetters(word)}.`;
      break;
    case 2:
      hintArea.textContent = `Hint: Starts with "${word[0]}".`;
      break;
    case 3:
      hintArea.textContent = `Hint: ${getCategoryHint(word)}`; // Add your own categories
      break;
  }
}

// Helper functions for hints
function countLetters(word) {
  const counts = {};
  for (const letter of word) {
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([_, count]) => count > 1)
    .map(([letter, count]) => `${count} "${letter}"s`)
    .join(' and ') || 'all unique letters';
}

function getCategoryHint(word) {
  // Customize these categories based on your word list!
  const categories = {
    apple: "fruit",
    beach: "vacation spot",
    // Add more word:category pairs
  };
  return `Category: ${categories[word] || "common object"}`;
}

// Update hint in timed mode
function updateHint() {
    const hintArea = document.querySelector('.hint-area');
    let hint = '';
    
    switch(gameState.hintLevel) {
        case 1:
            // Count of a specific letter
            const letterCounts = {};
            for (const letter of gameState.currentWord) {
                letterCounts[letter] = (letterCounts[letter] || 0) + 1;
            }
            const lettersWithCounts = Object.entries(letterCounts)
                .filter(([_, count]) => count > 1)
                .map(([letter, count]) => `${count} '${letter}'s`);
            
            if (lettersWithCounts.length > 0) {
                hint = `This word contains ${lettersWithCounts.join(' and ')}.`;
            } else {
                hint = 'All letters in this word are unique.';
            }
            break;
            
        case 2:
            // Starting letter
            hint = `This word starts with '${gameState.currentWord[0]}'.`;
            break;
            
        case 3:
            // Category hint
            // This would need to be part of your word database
            hint = 'This word is commonly found in the bathroom.';
            break;
    }
    
    hintArea.textContent = hint;
}

// Mark a team as failed for the current word in timed mode
function markTeamFailed(teamName) {
    const teamElements = document.querySelectorAll('.team-score');
    teamElements.forEach(el => {
        if (el.querySelector('.team-name').textContent === teamName) {
            el.classList.add('failed');
        }
    });
}

// Move to next word in timed mode
function nextTimedWord() {
    gameState.currentTimedWordIndex++;
    
    if (gameState.currentTimedWordIndex >= 5) {
        // End of timed mode
        elements.timedGameScreen.classList.add('hidden');
        
        // Move to next mode
        gameState.currentMode = 'riddle';
        gameState.currentRound = 1;
        showModeIntro('riddle');
    } else {
        // Next word
        gameState.currentWord = gameState.timedWords[gameState.currentTimedWordIndex];
        gameState.guesses = 0;
        gameState.hintLevel = 0;
        
        // Update UI
        document.querySelector('.word-display').innerHTML = '';
        document.querySelector('.hint-area').textContent = '';
        document.querySelector('.word-progress').textContent = `Word ${gameState.currentTimedWordIndex + 1} of 5`;
        
        // Reset timer
        clearTimeout(gameState.timer);
        startTimer(30, () => {
            // Time's up
            if (gameState.guesses < 3) {
                const teamName = gameState.teams[gameState.currentTeamIndex];
                gameState.scores[teamName] -= 50;
                updateScoreBar();
                markTeamFailed(teamName);
            }
            nextTimedWord();
        });
        
        // Move to next team
        gameState.currentTeamIndex = (gameState.currentTeamIndex + 1) % gameState.teams.length;
        document.querySelector('.current-team').textContent = `Current Team: ${gameState.teams[gameState.currentTeamIndex]}`;
    }
}

// Set up riddle mode
function setupRiddleMode() {
    elements.riddleGameScreen.classList.remove('hidden');
    
    // Select a random riddle
    const riddle = riddleWords[Math.floor(Math.random() * riddleWords.length)];
    gameState.currentRiddle = riddle.riddle;
    gameState.currentWord = riddle.answer.toUpperCase();
    gameState.revealedLetters = 0;
    gameState.guesses = 0;
    
    // Set up UI
    elements.riddleGameScreen.innerHTML = `
        <div class="riddle">${gameState.currentRiddle}</div>
        <div class="word-display"></div>
        <div class="timer">60</div>
        <div class="current-team">Current Team: ${gameState.teams[gameState.currentTeamIndex]}</div>
        <div class="input-area">
            <input type="text" class="word-input" required>
            <button class="submit-btn">Submit</button>
        </div>
    `;
    
    // Set up word display with blanks
    const wordDisplay = document.querySelector('.word-display');
    const displayText = gameState.currentWord.replace(/ /g, '_').replace(/./g, '_');
    wordDisplay.textContent = displayText;
    
    // Start timer
    startTimer(60, () => {
        // Time's up
        clearInterval(gameState.letterInterval);
        endRiddleRound(false);
    });
    
    // Start letter reveal interval
    gameState.letterInterval = setInterval(() => {
        gameState.revealedLetters++;
        revealNextLetter();
    }, 7000);
    
    // Set up submit handler
    document.querySelector('.submit-btn').addEventListener('click', processRiddleGuess);
    document.querySelector('.word-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            processRiddleGuess();
        }
    });
}

// Reveal next letter in riddle mode
function revealNextLetter() {
    const wordDisplay = document.querySelector('.word-display');
    const currentDisplay = wordDisplay.textContent.split('');
    const word = gameState.currentWord;
    
    for (let i = 0; i < word.length && gameState.revealedLetters > 0; i++) {
        if (currentDisplay[i] === '_' && word[i] !== ' ') {
            currentDisplay[i] = word[i];
            gameState.revealedLetters--;
        }
    }
    
    wordDisplay.textContent = currentDisplay.join('');
}

// Process a guess in riddle mode
function processRiddleGuess() {
    const input = document.querySelector('.word-input');
    const guess = input.value.toUpperCase();
    
    if (!guess) {
        alert('Please enter your guess');
        return;
    }
    
    gameState.guesses++;
    
    if (guess === gameState.currentWord) {
        // Correct guess
        clearTimeout(gameState.timer);
        clearInterval(gameState.letterInterval);
        
        // Calculate points based on revealed letters
        const teamName = gameState.teams[gameState.currentTeamIndex];
        let points = 0;
        const lettersRevealed = document.querySelector('.word-display').textContent.split('_').length - 1;
        
        if (lettersRevealed === 0) {
            points = 200;
        } else if (lettersRevealed <= 2) {
            points = 200 - (lettersRevealed * 50);
        } else {
            points = 50;
        }
        
        gameState.scores[teamName] += points;
        updateScoreBar();
        
        // Show success message
        const wordDisplay = document.querySelector('.word-display');
        wordDisplay.innerHTML += `<div class="success-message">Correct! +${points} points!</div>`;
        
        setTimeout(() => {
            endRiddleRound(true);
        }, 2000);
    } else {
        // Wrong guess
        input.value = '';
        gameState.scores[gameState.teams[gameState.currentTeamIndex]] -= 25;
        updateScoreBar();
    }
}

// End a round in riddle mode
function endRiddleRound(success) {
    elements.riddleGameScreen.classList.add('hidden');
    
    // Move to next team or end game
    gameState.currentTeamIndex++;
    gameState.currentRound++;
    
    if (gameState.currentTeamIndex >= gameState.teams.length) {
        gameState.currentTeamIndex = 0;
        
        if (gameState.currentRound > 3) {
            // End of game
            endGame();
        } else {
            // Next round
            setupRiddleMode();
        }
    } else {
        // Next team
        setupRiddleMode();
    }
}

// End the game and show final scores
function endGame() {
    elements.gameOverScreen.classList.remove('hidden');
    
    // Display final scores
    let scoresHTML = '<h2>Final Scores</h2><ul>';
    for (const [team, score] of Object.entries(gameState.scores)) {
        scoresHTML += `<li>${team}: ${score} points</li>`;
    }
    scoresHTML += '</ul>';
    
    elements.finalScores.innerHTML = scoresHTML;
}

// Reset the game to play again
function resetGame() {
    // Reset game state
    gameState.teams = [];
    gameState.currentTeamIndex = 0;
    gameState.currentMode = null;
    gameState.currentRound = 1;
    gameState.scores = {};
    gameState.usedWords = [];
    gameState.currentWord = '';
    gameState.currentRiddle = '';
    gameState.guesses = 0;
    gameState.timer = null;
    gameState.timeLeft = 0;
    gameState.revealedLetters = 0;
    
    // Hide all game screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show setup screen
    elements.setupScreen.classList.remove('hidden');
    elements.scoreBar.classList.add('hidden');
}

// Update the score bar
function updateScoreBar() {
    elements.scoreBar.innerHTML = '';
    
    gameState.teams.forEach(team => {
        const teamScore = document.createElement('div');
        teamScore.className = 'team-score';
        
        const emoji = document.createElement('span');
        emoji.className = 'team-emoji';
        emoji.textContent = '👥';
        
        const name = document.createElement('span');
        name.className = 'team-name';
        name.textContent = team;
        
        const score = document.createElement('span');
        score.className = 'team-points';
        score.textContent = gameState.scores[team];
        
        teamScore.appendChild(emoji);
        teamScore.appendChild(name);
        teamScore.appendChild(score);
        elements.scoreBar.appendChild(teamScore);
        
        // Add click handler for host selection
        teamScore.addEventListener('click', () => {
            // This would be used in timed/riddle modes when host selects a team
            // In a real implementation, this would pause the timer
            document.querySelectorAll('.team-score').forEach(el => {
                el.classList.remove('selected');
            });
            teamScore.classList.add('selected');
        });
    });
}

// Start a timer
function startTimer(seconds, callback) {
    clearTimeout(gameState.timer);
    gameState.timeLeft = seconds;
    
    const timerElement = document.querySelector('.timer');
    if (timerElement) {
        timerElement.textContent = seconds;
    }
    
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        
        if (timerElement) {
            timerElement.textContent = gameState.timeLeft;
        }
        
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            callback();
        }
    }, 1000);
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', init);
