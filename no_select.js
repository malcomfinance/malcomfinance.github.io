class TextSelectionBlocker {
    constructor(options = {}) {
        this.options = {
            preventLongTap: true,
            preventContextMenu: true,
            preventDrag: true,
            allowSelectors: [], // Elements that should allow selection
            excludeSelectors: [], // Elements to exclude from blocking
            debug: false,
            ...options
        };
        
        this.isTouchDevice = 'ontouchstart' in window;
        this.longTapTimer = null;
        this.longTapDelay = 500; // ms
        this.startX = 0;
        this.startY = 0;
        
        this.init();
    }
    
    init() {
        // Apply CSS first
        this.applyCSS();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Apply to existing elements
        this.applyToExistingElements();
        
        // Watch for dynamically added elements
        this.observeDOM();
        
        this.log('Text selection blocking initialized');
    }
    
    applyCSS() {
        // Add CSS rules dynamically
        const style = document.createElement('style');
        style.id = 'text-selection-blocker-styles';
        style.textContent = `
            .text-selection-blocked {
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                -webkit-touch-callout: none !important;
                cursor: default;
            }
            
            .text-selection-allowed {
                user-select: text !important;
                -webkit-user-select: text !important;
            }
            
            /* Remove selection highlights */
            .text-selection-blocked::selection,
            .text-selection-blocked::-moz-selection {
                background: transparent;
                color: inherit;
            }
        `;
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Touch events for mobile
        if (this.isTouchDevice && this.options.preventLongTap) {
            document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
            document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true });
        }
        
        // Mouse events for desktop
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('selectstart', this.handleSelectStart.bind(this));
        
        // Context menu (right-click/long-tap menu)
        if (this.options.preventContextMenu) {
            document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        }
        
        // Drag events
        if (this.options.preventDrag) {
            document.addEventListener('dragstart', this.handleDragStart.bind(this));
        }
        
        // Double-click selection
        document.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    handleTouchStart(event) {
        const target = event.target;
        
        // Check if selection should be allowed for this element
        if (this.shouldAllowSelection(target)) return;
        
        // Store starting position
        this.startX = event.touches[0].clientX;
        this.startY = event.touches[0].clientY;
        
        // Start long tap timer
        this.longTapTimer = setTimeout(() => {
            this.preventSelection();
            this.log('Long tap prevented');
        }, this.longTapDelay);
    }
    
    handleTouchEnd() {
        // Clear long tap timer
        if (this.longTapTimer) {
            clearTimeout(this.longTapTimer);
            this.longTapTimer = null;
        }
    }
    
    handleTouchMove(event) {
        // Clear timer if user moves finger (it's a scroll, not a long tap)
        if (this.longTapTimer) {
            const currentX = event.touches[0].clientX;
            const currentY = event.touches[0].clientY;
            const deltaX = Math.abs(currentX - this.startX);
            const deltaY = Math.abs(currentY - this.startY);
            
            // If movement exceeds threshold, cancel long tap detection
            if (deltaX > 10 || deltaY > 10) {
                clearTimeout(this.longTapTimer);
                this.longTapTimer = null;
            }
        }
    }
    
    handleMouseDown(event) {
        const target = event.target;
        
        // Check if selection should be allowed
        if (this.shouldAllowSelection(target)) return;
        
        // Prevent text selection on drag
        if (event.detail > 1) { // Double click or more
            this.preventSelection();
        }
    }
    
    handleSelectStart(event) {
        const target = event.target;
        
        if (!this.shouldAllowSelection(target)) {
            event.preventDefault();
            return false;
        }
    }
    
    handleContextMenu(event) {
        const target = event.target;
        
        if (!this.shouldAllowSelection(target)) {
            event.preventDefault();
            return false;
        }
    }
    
    handleDragStart(event) {
        const target = event.target;
        
        if (!this.shouldAllowSelection(target)) {
            event.preventDefault();
            return false;
        }
    }
    
    handleDoubleClick(event) {
        const target = event.target;
        
        if (!this.shouldAllowSelection(target)) {
            event.preventDefault();
            this.clearSelection();
            return false;
        }
    }
    
    shouldAllowSelection(element) {
        // Check allowed selectors
        for (const selector of this.options.allowSelectors) {
            if (element.matches(selector) || element.closest(selector)) {
                return true;
            }
        }
        
        // Check excluded selectors
        for (const selector of this.options.excludeSelectors) {
            if (element.matches(selector) || element.closest(selector)) {
                return false;
            }
        }
        
        // Check for specific classes or attributes
        if (element.closest('.text-selection-allowed') || 
            element.hasAttribute('data-allow-select')) {
            return true;
        }
        
        if (element.closest('.text-selection-blocked') || 
            element.hasAttribute('data-no-select')) {
            return false;
        }
        
        // Default: prevent selection
        return false;
    }
    
    preventSelection() {
        // Clear any existing selection
        this.clearSelection();
        
        // Prevent future selection temporarily
        document.body.classList.add('text-selection-blocked');
        
        // Restore after a short delay
        setTimeout(() => {
            document.body.classList.remove('text-selection-blocked');
        }, 100);
    }
    
    clearSelection() {
        if (window.getSelection) {
            if (window.getSelection().empty) {
                window.getSelection().empty();
            } else if (window.getSelection().removeAllRanges) {
                window.getSelection().removeAllRanges();
            }
        } else if (document.selection) {
            document.selection.empty();
        }
    }
    
    applyToExistingElements() {
        // Apply to all elements except those that should allow selection
        const allElements = document.querySelectorAll('*:not(.text-selection-allowed):not([data-allow-select])');
        
        allElements.forEach(element => {
            if (!this.shouldAllowSelection(element)) {
                element.classList.add('text-selection-blocked');
            }
        });
    }
    
    observeDOM() {
        // Watch for dynamically added elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (!this.shouldAllowSelection(node)) {
                            node.classList.add('text-selection-blocked');
                        }
                        // Apply to children too
                        node.querySelectorAll('*').forEach(child => {
                            if (!this.shouldAllowSelection(child)) {
                                child.classList.add('text-selection-blocked');
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    log(message) {
        if (this.options.debug) {
            console.log(`[Selection Blocker] ${message}`);
        }
    }
    
    // Public API
    enable() {
        this.options.preventLongTap = true;
        this.options.preventContextMenu = true;
        this.options.preventDrag = true;
    }
    
    disable() {
        this.options.preventLongTap = false;
        this.options.preventContextMenu = false;
        this.options.preventDrag = false;
        document.body.classList.remove('text-selection-blocked');
    }
    
    addAllowedSelector(selector) {
        this.options.allowSelectors.push(selector);
        this.applyToExistingElements();
    }
    
    removeAllowedSelector(selector) {
        const index = this.options.allowSelectors.indexOf(selector);
        if (index > -1) {
            this.options.allowSelectors.splice(index, 1);
        }
    }
    
    destroy() {
        // Clean up
        document.querySelector('#text-selection-blocker-styles')?.remove();
        document.body.classList.remove('text-selection-blocked');
        
        // Remove event listeners would need proper reference keeping
        // For simplicity, we'll just disable
        this.disable();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.selectionBlocker = new TextSelectionBlocker({
        preventLongTap: true,
        preventContextMenu: true,
        preventDrag: true,
        allowSelectors: [
            'input',
            'textarea',
            '.editable',
            '[contenteditable="true"]',
            '.allow-select'
        ],
        excludeSelectors: [],
        debug: false
    });
});