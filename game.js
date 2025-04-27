class PaloseboGame {
    constructor() {
        this.player = document.getElementById('player');
        this.startButton = document.getElementById('startButton');
        this.restartButton = document.getElementById('restartButton');
        this.winMessage = document.getElementById('winMessage');
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isPlaying = false;
        this.playerPosition = 0;
        this.maxHeight = 500; // Match the new bamboo pole height
        this.climbSpeed = 0;
        this.animationFrame = null;
        this.timer = 0;
        this.timerInterval = null;
        this.bestTime = localStorage.getItem('paloseboBestTime') || null;
        this.gravity = 0.5; // Speed at which player falls when no sound
        this.fallSpeed = 0;

        this.init();
    }

    async init() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.restartButton.addEventListener('click', () => this.restartGame());
        
        // Create timer display
        this.createTimerDisplay();
    }
    
    createTimerDisplay() {
        // Create timer element
        const timerContainer = document.createElement('div');
        timerContainer.className = 'timer-container';
        
        const timerLabel = document.createElement('div');
        timerLabel.className = 'timer-label';
        timerLabel.textContent = 'Time:';
        
        const timerDisplay = document.createElement('div');
        timerDisplay.className = 'timer-display';
        timerDisplay.id = 'timerDisplay';
        timerDisplay.textContent = '00:00';
        
        const bestTimeLabel = document.createElement('div');
        bestTimeLabel.className = 'best-time-label';
        bestTimeLabel.textContent = 'Best Time:';
        
        const bestTimeDisplay = document.createElement('div');
        bestTimeDisplay.className = 'best-time-display';
        bestTimeDisplay.id = 'bestTimeDisplay';
        bestTimeDisplay.textContent = this.bestTime ? this.formatTime(this.bestTime) : '--:--';
        
        timerContainer.appendChild(timerLabel);
        timerContainer.appendChild(timerDisplay);
        timerContainer.appendChild(bestTimeLabel);
        timerContainer.appendChild(bestTimeDisplay);
        
        // Insert after game area
        const gameArea = document.querySelector('.game-area');
        gameArea.parentNode.insertBefore(timerContainer, gameArea.nextSibling);
    }

    async startGame() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            
            this.microphone.connect(this.analyser);
            this.analyser.fftSize = 256;
            
            this.isPlaying = true;
            this.startButton.disabled = true;
            this.startButton.textContent = 'Game in Progress';
            
            // Reset timer
            this.timer = 0;
            this.updateTimerDisplay();
            this.startTimer();
            
            this.gameLoop();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Please allow microphone access to play the game!');
        }
    }
    
    startTimer() {
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.updateTimerDisplay();
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        timerDisplay.textContent = this.formatTime(this.timer);
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    gameLoop() {
        if (!this.isPlaying) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Convert volume to climb speed (0-5 pixels per frame)
        this.climbSpeed = Math.min(5, average / 20);
        
        // Apply gravity when no sound is detected (very low volume)
        if (average < 5) {
            this.fallSpeed += this.gravity;
            this.climbSpeed = -this.fallSpeed;
        } else {
            this.fallSpeed = 0;
        }
        
        // Update player position
        this.playerPosition += this.climbSpeed;
        
        // Prevent player from going below the ground
        if (this.playerPosition < 0) {
            this.playerPosition = 0;
            this.fallSpeed = 0;
        }
        
        this.player.style.bottom = `${this.playerPosition}px`;
        
        // Check if player reached the top (adjusted for new player height)
        if (this.playerPosition >= this.maxHeight - 80) { // 80px is player height
            this.gameWin();
            return;
        }
        
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    }

    gameWin() {
        this.isPlaying = false;
        cancelAnimationFrame(this.animationFrame);
        clearInterval(this.timerInterval);
        
        // Stop audio context
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // Update best time if needed
        if (!this.bestTime || this.timer < this.bestTime) {
            this.bestTime = this.timer;
            localStorage.setItem('paloseboBestTime', this.timer);
            document.getElementById('bestTimeDisplay').textContent = this.formatTime(this.timer);
        }
        
        // Show win message with time
        const winTimeDisplay = document.createElement('p');
        winTimeDisplay.className = 'win-time';
        winTimeDisplay.textContent = `Your time: ${this.formatTime(this.timer)}`;
        
        // Remove any existing win time display
        const existingWinTime = this.winMessage.querySelector('.win-time');
        if (existingWinTime) {
            existingWinTime.remove();
        }
        
        // Insert after the "You reached the flag!" message
        const winMessage = this.winMessage.querySelector('p');
        this.winMessage.insertBefore(winTimeDisplay, winMessage.nextSibling);
        
        this.winMessage.classList.remove('hidden');
        
        // Trigger confetti animation
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    restartGame() {
        // Reset game state
        this.playerPosition = 0;
        this.player.style.bottom = '0px';
        this.fallSpeed = 0;
        this.winMessage.classList.add('hidden');
        this.startButton.disabled = false;
        this.startButton.textContent = 'Start Game';
        
        // Start new game
        this.startGame();
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new PaloseboGame();
}); 