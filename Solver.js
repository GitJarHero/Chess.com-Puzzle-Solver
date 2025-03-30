class PuzzleBot {

    constructor(window) {
        this.window = window;       // the FloatingWindow
        this.solveCurrent = false;  // true when "solve" button was clicked. false when puzzle is solved or button is clicked again before puzzle is solved.
        this.autoPlay = false;      // true while "autoplay" button is active
        this.initialized = false;
        this.prush = Number.MAX_VALUE;
    }

    init() {
        console.log("Bot: init()")
        this.engine = null // the sf worker
        this.game = document.querySelector('wc-chess-board').game
        this.originalMoveFunc = this.game.move
        this.createWorker()
        this.initProxy()
        this.initialized = true;
    }

    checkPuzzleFound() {
        console.log("Bot: checkPuzzleFound()")
        const puzzle = document.querySelector('#puzzles-board-popover');
        const notStartPos = document.querySelector('wc-chess-board').game.getFEN() != "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        return puzzle && notStartPos
    }

    solve() {
        console.log("Bot: slove()")
        if(this.checkPuzzleFound() && !this.checkPuzzleFinished()) {
            if(!this.initialized) {
                this.init()
            }
            if(this.isMyTurn()) {
                this.solveCurrent = true
                this.window.toggleSolve()
                this.startCalculation()
            }
        }
    }

    toggleAutoPlay() {
        this.autoPlay = !this.autoPlay;

        if(this.autoPlay) {
            if(this.checkPuzzleFound()) {
                if(this.checkPuzzleFinished()) {
                    this.gotoNextPuzzle();
                    return;
                }
                if(!this.initialized) {
                    this.init()
                }
                if(this.isMyTurn()) {
                    this.startCalculation()
                }
            }
        }
    }
    
    createWorker() {
        console.log("Bot: createWorker()")
        this.engine = new Worker(URL.createObjectURL(new Blob([`
            importScripts('https://cdn.jsdelivr.net/gh/GitJarHero/SF16.1-JavaScript-version/stockfish-16.1-asm.js');
        `], { type: 'application/javascript' })));
    
        this.engine.onmessage = (event) => {
            console.log(event)
            if (event && typeof event.data === 'string') {
                if(event.data.startsWith("bestmove")){
                    if(this.solveCurrent == true || this.autoPlay == true) {
                        let bestMove = event.data.split(" ")[1]
                        this.simulateMove(bestMove)
                    }
                }
            }
        }
    }

    initProxy() {
        console.log("Bot: initProxy()")
        const self = this;

        const proxy = new Proxy(this.originalMoveFunc, {
            apply(target, thisArg, argumentsList) {
                // execute original move function first
                const result = Reflect.apply(target, thisArg, argumentsList);
                // chain custom code afterwards:
                console.log("moved: ", argumentsList)
                if (argumentsList[0].nocomputermove == undefined) {
                    // if tcn is present, the move was made by the computer
                    // meaning, the puzzle is not over yet.
                    if(self.solveCurrent || self.autoPlay) {
                        self.startCalculation()
                    }
                }
                return result;
            }
        });

        this.game.move = proxy;
        console.log("proxy ready")
    }
    
    startCalculation() {
        console.log("Bot: startCalculation()")
        this.updatePrushScore()
        this.engine.postMessage(`position fen ${this.game.getFEN()}`)
        this.engine.postMessage("go depth 18")
    }

    updatePrushScore() {
        let puzzleRushScore = document.querySelector('.sidebar-play-solved');
        if(puzzleRushScore) {
            if(puzzleRushScore.textContent == '--') {
                this.prush = 0;
            }
            else {
                this.prush = Number(puzzleRushScore.textContent)
            }
        }
    }
    
    simulateMove(ucimove) {
        console.log("Bot: simulateMove()")

        let legalMoves = this.game.getLegalMoves();
        let isPromotion = ucimove.length === 5;
        let myMove = {};
        
        legalMoves.forEach(mv => {
            if (mv.from === ucimove.substring(0, 2) && mv.to === ucimove.substring(2,4)) {
                if (isPromotion) {
                    let promotion = ucimove.charAt(4)
                    if (mv.promotion == promotion) {
                        myMove = mv
                        myMove.userGenerated = true
                        myMove.userGeneratedDrop = true
                        // the foreach could stop here, actually
                    }
                } else {
                    myMove = mv
                    myMove.userGenerated = true
                    myMove.userGeneratedDrop = true
                    // the foreach could stop here, actually
                }
            }
        });

        myMove.nocomputermove = true;
        this.game.move(myMove);
        
        setTimeout(() => {
            if(this.checkPuzzleFinished()) {
                
                if(this.solveCurrent) {
                    this.solveCurrent = false;
                    this.window.toggleSolve()
                }
                
                if(this.autoPlay) {
                    this.gotoNextPuzzle()
                }

            }
        }, 100)
        
    }
    
    checkPuzzleFinished() {
        console.log("Bot: checkPuzzleFinished()")
        
        let puzzleRushScore = document.querySelector('.sidebar-play-solved');
        if (puzzleRushScore) {
            let newScore = Number(puzzleRushScore.textContent);
            if(this.prush < newScore) {
                this.prush = newScore;
                return true;
            } else {
                return false;
            }
        }

        if(document.querySelector('.message-move-move.message-move-solved')) {
            // when daily puzzle is solved
            return true;
        }

        
        return document.querySelector('button[aria-label="Next Puzzle"]') !== null;
    }

    async goToNextUnsolvedDailyPuzzle() {
        // method used for finding the next daily puzzle that was not solved yet.
        while (document.querySelector('.message-move-move.message-move-solved')) { // Daily Puzzle solved
            let nextDayButton = document.querySelector('button[aria-label="Next Day"]');
            
            if (nextDayButton && !nextDayButton.disabled) { // If next day button is available
                nextDayButton.click();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 100ms to ensure loading
                
                // Check if the new puzzle is solved
                if (!document.querySelector('.message-move-move.message-move-solved')) {
                    this.startCalculation();
                    return;
                }
            } else {
                this.window.toggleAutoPlay();
                return;
            }
        }
    }
    
    
    gotoNextPuzzle() {
        console.log("Bot: gotoNextPuzzle()")

        // puzzle rush
        let isPuzzleRush = document.querySelector('.sidebar-play-solved');
        if(isPuzzleRush) {
            return; // in prush, it moves to next puzzle automatically and there is no button too...
        }

        // daily puzzles mode
        if(window.location.href.startsWith("https://www.chess.com/daily-chess-puzzle")) {
            this.goToNextUnsolvedDailyPuzzle()
            return;
        }
        
        // normal puzzles mode
        document.querySelector('button[aria-label="Next Puzzle"]').click()
    }

    isMyTurn() {
        console.log("Bot: isMyTurn()")
        return this.game.getTurn() == this.game.getPlayingAs()
    }

}

class FloatingWindow {

    constructor() {
        this.windowConfig = {
            width: 250,
            height: 300,
            bgColor: "#2c2f33",
            borderRadius: "10px",
            shadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
            zIndex: 9999
        };

        this.buttonConfig = {
            width: 200,
            padding: "10px",
            borderRadius: "5px",
            fontSize: "14px",
            primaryColor: "#7289da",
            activeColor: "#2ecc71",
            closeColor: "#e74c3c",
            transition: "all 0.2s ease"
        };

        this.isDragging = false;
        this.autoplayActive = false;
        this.solveActive = false;
        this.createWindow();

        this.bot = new PuzzleBot(this);
    }

    solve() {
        console.log("window.slove()")
        this.bot.solve()
    }

    createWindow() {
        this.createContainer();
        this.createHeader();
        this.createCloseButton();
        this.createActionButtons();
        this.createInfoText();
        this.createIconButtons();
        this.addEventListeners();
    }

    createContainer() {
        this.container = document.createElement("div");
        Object.assign(this.container.style, {
            width: `${this.windowConfig.width}px`,
            height: `${this.windowConfig.height}px`,
            backgroundColor: this.windowConfig.bgColor,
            position: "fixed",
            top: "100px",
            left: "100px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            borderRadius: this.windowConfig.borderRadius,
            boxShadow: this.windowConfig.shadow,
            cursor: "grab",
            zIndex: this.windowConfig.zIndex,
            userSelect: "none"
        });
        document.body.appendChild(this.container);
    }

    createHeader() {
        const header = document.createElement("h2");
        header.innerText = "Puzzle Solver";
        Object.assign(header.style, {
            color: "white",
            marginTop: "10px",
            fontSize: "18px",
            marginBottom: "10px"
        });
        this.container.appendChild(header);
    }

    createCloseButton() {
        this.closeButton = document.createElement("button");
        this.closeButton.innerText = "X";
        Object.assign(this.closeButton.style, {
            position: "absolute",
            top: "10px",
            right: "10px",
            backgroundColor: this.buttonConfig.closeColor,
            color: "white",
            border: "none",
            padding: "5px 10px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "14px",
            transition: this.buttonConfig.transition
        });
        this.container.appendChild(this.closeButton);
    }

    createActionButtons() {
        const buttonGroup = document.createElement("div");
        Object.assign(buttonGroup.style, {
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "10px"
        });
        
        this.solveButton = this.createButton("Solve");
        this.solveButton.id = "solvebutton";
        this.autoplayButton = this.createButton("Autoplay");
        this.autoplayButton.id = "autoplaybutton";
        
        buttonGroup.appendChild(this.solveButton);
        buttonGroup.appendChild(this.autoplayButton);
        this.container.appendChild(buttonGroup);
    }

    createButton(text) {
        const button = document.createElement("button");
        button.innerText = text;
        Object.assign(button.style, {
            width: `${this.buttonConfig.width}px`,
            padding: this.buttonConfig.padding,
            border: "none",
            borderRadius: this.buttonConfig.borderRadius,
            cursor: "pointer",
            fontSize: this.buttonConfig.fontSize,
            backgroundColor: this.buttonConfig.primaryColor,
            color: "white",
            transition: this.buttonConfig.transition
        });
        
        button.addEventListener("mousedown", () => {
            button.style.transform = "scale(0.98)";
        });
        
        button.addEventListener("mouseup", () => {
            button.style.transform = "scale(1)";
        });
        
        button.addEventListener("mouseleave", () => {
            button.style.transform = "scale(1)";
        });
        
        return button;
    }

    createInfoText() {
        this.info = document.createElement('span');
        // Set initial text and color
        const updateText = () => {
            const specificElement = document.querySelector('#puzzles-board-popover'); // Replace with your actual selector
            const board = document.querySelector('wc-chess-board');
            const notStartPos = board.game.getFEN() != "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            if (specificElement && board && notStartPos) {
                this.info.textContent = "Puzzle detected";
                this.info.style.color = "green";
            } else {
                this.info.textContent = "No puzzle detected";
                this.info.style.color = "red";
            }
        };
        // Initial call
        updateText();
        // Set interval to check every 500ms
        setInterval(updateText, 300);
        this.container.appendChild(this.info);
    }

    createIconButtons() {
        this.iconsContainer = document.createElement("div");
        Object.assign(this.iconsContainer.style, {
            marginBottom: "15px"
        });
        
        this.createIconButton(
            "https://github.com/GitJarHero", 
            "GitHub", 
            "https://cdn.jsdelivr.net/gh/GitJarHero/Chess.com-Puzzle-Solver@main/github-brands.svg", 
            20
        );
        
        this.createIconButton(
            "https://discordapp.com/users/216163718801653760", 
            "Discord", 
            "https://cdn.jsdelivr.net/gh/GitJarHero/Chess.com-Puzzle-Solver@main/discord-brands.svg", 
            60
        );
        
        this.container.appendChild(this.iconsContainer);
    }

    createIconButton(link, altText, iconSrc, marginTop) {
        const iconContainer = document.createElement("a");
        iconContainer.href = link;
        iconContainer.target = "_blank";
        iconContainer.style.marginTop = `${marginTop}px`;

        const icon = document.createElement("img");
        icon.src = iconSrc;
        icon.alt = altText;
        Object.assign(icon.style, {
            width: "30px",
            height: "30px",
            margin: "0 5px",
            filter: "invert(1)",
            transition: this.buttonConfig.transition
        });

        iconContainer.appendChild(icon);
        this.iconsContainer.appendChild(iconContainer);
    }

    addEventListeners() {
        this.container.addEventListener("mousedown", (e) => this.startDrag(e));
        document.addEventListener("mousemove", (e) => this.drag(e));
        document.addEventListener("mouseup", () => this.stopDrag());
        this.solveButton.addEventListener("click", () => this.solve())
        this.autoplayButton.addEventListener("click", () => this.toggleAutoplay());
        this.closeButton.addEventListener("click", () => this.onClose());
        
        // Smooth out dragging by using requestAnimationFrame
        this.rafId = null;
    }

    startDrag(e) {
        if (e.target === this.container || e.target.tagName === "H2") {
            this.isDragging = true;
            const rect = this.container.getBoundingClientRect();
            this.offsetX = e.clientX - rect.left;
            this.offsetY = e.clientY - rect.top;
            this.container.style.cursor = "grabbing";
            this.container.style.userSelect = "none";
        }
    }

    drag(e) {
        if (!this.isDragging) return;
        
        // Use requestAnimationFrame for smoother dragging
        cancelAnimationFrame(this.rafId);
        this.rafId = requestAnimationFrame(() => {
            const rect = this.container.getBoundingClientRect();
            let newLeft = e.clientX - this.offsetX;
            let newTop = e.clientY - this.offsetY;
            
            const maxLeft = window.innerWidth - rect.width;
            const maxTop = window.innerHeight - rect.height;
            
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));
            
            this.container.style.left = `${newLeft}px`;
            this.container.style.top = `${newTop}px`;
        });
    }

    stopDrag() {
        this.isDragging = false;
        this.container.style.cursor = "grab";
        cancelAnimationFrame(this.rafId);
    }

    toggleAutoplay() {
        this.autoplayActive = !this.autoplayActive;
        
        if (this.autoplayActive) {
            this.autoplayButton.style.backgroundColor = this.buttonConfig.activeColor;
            this.solveButton.disabled = true;
            this.solveButton.style.opacity = "0.7";
        } else {
            this.autoplayButton.style.backgroundColor = this.buttonConfig.primaryColor;
            this.solveButton.disabled = false;
            this.solveButton.style.opacity = "1";
        }
        
        this.bot.toggleAutoPlay()
    }

    toggleSolve() {
        console.log("window: toggleSovle()" )

        this.solveActive = !this.solveActive;
        const isActive = this.solveActive;
        
        [this.solveButton, this.autoplayButton].forEach(button => {
            button.disabled = isActive;
            button.style.opacity = isActive ? "0.7" : "1";
        });
    
        this.solveButton.style.backgroundColor = isActive ? this.buttonConfig.activeColor : this.buttonConfig.primaryColor;
    }
    

    onClose() {
        cancelAnimationFrame(this.rafId);
        this.container.remove();
        console.log("Bye!")
    }
}

new FloatingWindow();
