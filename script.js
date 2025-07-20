document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const characterSelectionScreen = document.getElementById('character-selection');
    const playerNameInput = document.getElementById('player-name-input');
    const gameScreen = document.getElementById('game-screen');
    const playerNameDisplay = document.getElementById('player-name-display');
    const quizModal = document.getElementById('quiz-modal');
    const endGameModal = document.getElementById('end-game-modal');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const gameBoard = document.getElementById('game-board');
    const charButtons = document.querySelectorAll('.char-btn');
    const playAgainBtn = document.getElementById('play-again-btn');
    const restartBtn = document.getElementById('restart-btn');
    const touchControlPads = document.querySelectorAll('.d-pad');

    // --- Web Audio API Setup & Functions (Unchanged) ---
    let audioCtx = null, bgmOscillator = null, bgmGain = null, isBgmPlaying = false;
    const correctMelody = [ { freq: 440.0, duration: 0.1, delay: 0 }, { freq: 587.33, duration: 0.15, delay: 0.1 } ];
    const incorrectMelody = [ { freq: 164.81, duration: 0.25, delay: 0 } ];
    const goodTryMelody = [ { freq: 261.63, duration: 0.15, delay: 0 }, { freq: 329.63, duration: 0.3, delay: 0.2 } ];
    const victoryMelody = [ { freq: 261.63, duration: 0.15, delay: 0.0 }, { freq: 261.63, duration: 0.15, delay: 0.2 }, { freq: 392.00, duration: 0.15, delay: 0.4 }, { freq: 523.25, duration: 0.3,  delay: 0.6 }, { freq: 440.00, duration: 0.2,  delay: 0.95 }, { freq: 587.33, duration: 0.4,  delay: 1.2 } ];
    const backgroundMelody = [ 130.81, 196.00, 164.81, 196.00 ];
    const noteDuration = 0.5;
    function initAudioContext() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    function playSoundEffect(melody) { if (!audioCtx) return; melody.forEach(note => { const oscillator = audioCtx.createOscillator(); const gainNode = audioCtx.createGain(); oscillator.connect(gainNode); gainNode.connect(audioCtx.destination); oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(note.freq, audioCtx.currentTime + note.delay); gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime + note.delay); gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + note.delay + note.duration); oscillator.start(audioCtx.currentTime + note.delay); oscillator.stop(audioCtx.currentTime + note.delay + note.duration); }); }
    function startBackgroundMusic() { if (!audioCtx || isBgmPlaying) return; bgmOscillator = audioCtx.createOscillator(); bgmGain = audioCtx.createGain(); bgmOscillator.connect(bgmGain); bgmGain.connect(audioCtx.destination); bgmOscillator.type = 'sine'; bgmGain.gain.value = 0.08; const startTime = audioCtx.currentTime; backgroundMelody.forEach((freq, index) => bgmOscillator.frequency.setValueAtTime(freq, startTime + index * noteDuration)); bgmOscillator.onended = () => { if (isBgmPlaying) startBackgroundMusic(); }; bgmOscillator.start(startTime); bgmOscillator.stop(startTime + backgroundMelody.length * noteDuration); isBgmPlaying = true; }
    function stopBackgroundMusic() { if (bgmOscillator) { isBgmPlaying = false; bgmOscillator.onended = null; bgmOscillator.stop(); bgmOscillator = null; } }

    // --- Game State ---
    let player = { name: "Hero", char: '🤖', x: 1, y: 1 };
    let score = 0, currentQuestion = null, totalQuestions = 0, correctAnswers = 0, questionsAnswered = 0;
    let mapLayout = [];

    // --- Game Logic ---
    function generateConnectedMap(width, height, questionCount) { let map = Array.from({ length: height }, () => Array(width).fill(1)); const stack = [], startX = 1, startY = 1; map[startY][startX] = 0; stack.push([startX, startY]); while (stack.length > 0) { const [cx, cy] = stack[stack.length - 1], neighbors = []; for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) { const nx = cx + dx, ny = cy + dy; if (ny >= 0 && ny < height && nx >= 0 && nx < width && map[ny][nx] === 1) neighbors.push([nx, ny]); } if (neighbors.length > 0) { const [nx, ny] = neighbors[Math.floor(Math.random() * neighbors.length)]; map[(cy + ny) / 2][(cx + nx) / 2] = 0; map[ny][nx] = 0; stack.push([nx, ny]); } else { stack.pop(); } } for (let y = 1; y < height - 1; y++) { for (let x = 1; x < width - 1; x++) { if (map[y][x] === 1 && Math.random() < 0.25) map[y][x] = 0; } } const emptyTiles = []; for (let y = 0; y < height; y++) { for (let x = 0; x < width; x++) { if (map[y][x] === 0 && !(x === startX && y === startY)) emptyTiles.push({ x, y }); } } emptyTiles.sort(() => Math.random() - 0.5); let placedQuestions = Math.min(questionCount, emptyTiles.length); for (let i = 0; i < placedQuestions; i++) { map[emptyTiles[i].y][emptyTiles[i].x] = 2; } totalQuestions = placedQuestions; return map; }

    function initGame() {
        mapLayout = generateConnectedMap(11, 11, 8);
        correctAnswers = 0; questionsAnswered = 0; score = 0;
        player.x = 1; player.y = 1;
        scoreDisplay.textContent = score;
        playerNameDisplay.textContent = player.name;
        
        endGameModal.classList.add('hidden');
        characterSelectionScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        stopBackgroundMusic();
        startBackgroundMusic();
        renderMap();
    }

    function renderMap() {
        gameBoard.style.gridTemplateColumns = `repeat(${mapLayout[0].length}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${mapLayout.length}, 1fr)`;
        gameBoard.innerHTML = '';
        for (let y = 0; y < mapLayout.length; y++) {
            for (let x = 0; x < mapLayout[y].length; x++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                if (mapLayout[y][x] === 1) {
                    tile.classList.add('wall');
                } else if (mapLayout[y][x] === 2) {
                    tile.classList.add('question');
                    // MODIFICATION: Use a span for the icon to target it for animation
                    const icon = document.createElement('span');
                    icon.textContent = '💰';
                    tile.appendChild(icon);
                }
                if (player.x === x && player.y === y) {
                    tile.classList.add('player');
                    tile.textContent = player.char;
                }
                gameBoard.appendChild(tile);
            }
        }
    }
    
    function handleKeyPress(e) {
        if (!quizModal.classList.contains('hidden') || !endGameModal.classList.contains('hidden')) return;
        let newX = player.x, newY = player.y;
        switch(e.key) {
            case 'ArrowUp': newY--; break;
            case 'ArrowDown': newY++; break;
            case 'ArrowLeft': newX--; break;
            case 'ArrowRight': newX++; break;
            default: return;
        }
        if (mapLayout[newY] && mapLayout[newY][newX] !== 1) {
            player.x = newX;
            player.y = newY;
            if (mapLayout[player.y][player.x] === 2) {
                // MODIFICATION: Apply animation effect before triggering quiz
                const tileIndex = player.y * mapLayout[0].length + player.x;
                const tileElement = gameBoard.children[tileIndex];
                if (tileElement && tileElement.firstChild) {
                    tileElement.firstChild.classList.add('collected-effect');
                }
                
                triggerQuiz();
                mapLayout[player.y][player.x] = 0;
            } else {
                // Only re-render if we are just moving, not triggering a quiz
                renderMap();
            }
        }
    }

    function triggerQuiz() { currentQuestion = generateQuestion(); const questionText = document.getElementById('question-text'); const answerOptions = document.getElementById('answer-options'); const feedbackMessage = document.getElementById('feedback-message'); questionText.textContent = currentQuestion.question; answerOptions.innerHTML = ''; feedbackMessage.textContent = ''; feedbackMessage.className = 'feedback'; const shuffledOptions = currentQuestion.options.sort(() => Math.random() - 0.5); shuffledOptions.forEach(option => { const button = document.createElement('button'); button.textContent = option; button.onclick = () => checkAnswer(option); answerOptions.appendChild(button); }); quizModal.classList.remove('hidden'); }

    function generateQuestion() { const num1 = Math.floor(Math.random() * 10) + 1; const num2 = Math.floor(Math.random() * 10) + 1; const correctAnswer = num1 + num2; const options = new Set([correctAnswer]); while (options.size < 4) { const wrongAnswer = correctAnswer + (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1); if (wrongAnswer > 0 && wrongAnswer !== correctAnswer) options.add(wrongAnswer); } return { question: `What is ${num1} + ${num2}?`, options: Array.from(options), correctAnswer }; }

    function checkAnswer(selectedAnswer) { const feedbackMessage = document.getElementById('feedback-message'); if (parseInt(selectedAnswer) === currentQuestion.correctAnswer) { playSoundEffect(correctMelody); score++; correctAnswers++; scoreDisplay.textContent = score; feedbackMessage.textContent = 'Correct! +1 Point!'; feedbackMessage.classList.add('correct'); } else { playSoundEffect(incorrectMelody); feedbackMessage.textContent = 'Oops! Try the next one!'; feedbackMessage.classList.add('incorrect'); } document.querySelectorAll('#answer-options button').forEach(b => b.disabled = true); setTimeout(() => { questionsAnswered++; quizModal.classList.add('hidden'); renderMap(); if (questionsAnswered === totalQuestions) { triggerEndGame(); } }, 1500); }
    
    function triggerEndGame() {
        const titleEl = document.getElementById('end-game-title');
        const messageEl = document.getElementById('end-game-message');
        stopBackgroundMusic();
        if (score === totalQuestions && totalQuestions > 0) {
            playSoundEffect(victoryMelody);
            titleEl.textContent = 'VICTORY!';
            messageEl.textContent = `Amazing job, ${player.name}! You got a perfect score!`;
        } else {
            playSoundEffect(goodTryMelody);
            titleEl.textContent = 'Good Try!';
            messageEl.textContent = `Great effort, ${player.name}! Keep practicing!`;
        }
        gameScreen.classList.add('hidden');
        finalScoreDisplay.textContent = score;
        endGameModal.classList.remove('hidden');
    }

    // --- Global Event Listeners ---
    ['click', 'keydown'].forEach(eventName => document.addEventListener(eventName, initAudioContext, { once: true }));
    charButtons.forEach(button => {
        button.addEventListener('click', () => {
            player.char = button.getAttribute('data-char');
            player.name = playerNameInput.value.trim() || "Hero";
            initGame();
        });
    });
    playAgainBtn.addEventListener('click', () => {
        endGameModal.classList.add('hidden');
        characterSelectionScreen.classList.remove('hidden');
    });
    restartBtn.addEventListener('click', () => { initGame(); });
    document.addEventListener('keydown', handleKeyPress);
    touchControlPads.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const fakeEvent = { key: button.dataset.direction };
            handleKeyPress(fakeEvent);
        });
    });
});