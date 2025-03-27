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
        this.createWindow();
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
        this.autoplayButton = this.createButton("Autoplay");
        
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
            const notStartPos = document.querySelector('wc-chess-board').game.getFEN() != "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
            if (specificElement && notStartPos) {
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
            "https://github.com", 
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
    }

    onClose() {
        cancelAnimationFrame(this.rafId);
        this.container.remove();
    }
}

new FloatingWindow();
