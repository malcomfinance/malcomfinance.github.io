class PullToRefreshBlocker {
    constructor(options = {}) {
        this.options = {
            preventOnTop: true,
            preventOnBottom: false,
            threshold: 10,
            ...options
        };
        
        this.startY = 0;
        this.enabled = true;
        
        this.init();
    }
    
    init() {
        // Touch events for mobile
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        
        // Wheel event for desktop (some browsers trigger refresh with mouse)
        document.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Enable overscroll-behavior via CSS
        this.applyCSS();
    }
    
    applyCSS() {
        const style = document.createElement('style');
        style.textContent = `
            html { overscroll-behavior-y: none; }
        `;
        document.head.appendChild(style);
    }
    
    handleTouchStart(e) {
        if (!this.enabled) return;
        
        this.startY = e.touches[0].clientY;
        
        // Check if we're at the top
        if (this.options.preventOnTop && window.scrollY <= 0) {
            this.isAtTop = true;
        } else {
            this.isAtTop = false;
        }
        
        // Check if we're at the bottom
        if (this.options.preventOnBottom) {
            const scrollHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY + window.innerHeight;
            this.isAtBottom = Math.abs(scrollHeight - scrollTop) < 1;
        }
    }
    
    handleTouchMove(e) {
        if (!this.enabled) return;
        
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - this.startY;
        
        // Prevent pull-to-refresh at top
        if (this.isAtTop && deltaY > this.options.threshold) {
            e.preventDefault();
            return;
        }
        
        // Prevent push-to-refresh at bottom (if enabled)
        if (this.options.preventOnBottom && this.isAtBottom && deltaY < -this.options.threshold) {
            e.preventDefault();
            return;
        }
    }
    
    handleWheel(e) {
        if (!this.enabled) return;
        
        // Prevent wheel overscroll at top
        if (this.options.preventOnTop && 
            window.scrollY <= 0 && 
            e.deltaY < 0) {
            e.preventDefault();
        }
    }
    
    enable() {
        this.enabled = true;
    }
    
    disable() {
        this.enabled = false;
    }
    
    destroy() {
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('wheel', this.handleWheel);
    }
}

// Usage
const blocker = new PullToRefreshBlocker({
    preventOnTop: true,
    preventOnBottom: false,
    threshold: 5
});