// a.js — Luminux AI v4 - Always Detailed Version
(() => {
  "use strict";

  /* -------------------------
     Configuration & Constants
     ------------------------- */
  const GROQ_API_KEY = "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";
  const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
  const STORAGE_KEY = "L-H-History";
  const MAX_HISTORY = 2000;

  // SVG Icons for UI
  const copyIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`;
  
  const downloadIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>`;

  /* -------------------------
     Utility Functions
     ------------------------- */
  const el = (id) => document.getElementById(id);
  const onIfExists = (node, ev, handler) => { if (node) node.addEventListener(ev, handler); };
  const escapeHtml = (s = "") => s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nowStamp = () => new Date().toISOString();
  
  function scrollChatBottom(container) {
    if (!container) return;
    requestAnimationFrame(() => container.scrollTop = container.scrollHeight);
  }
  
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('Copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  }
  
  function downloadAsFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* -------------------------
     Enhanced Text Formatting
     ------------------------- */
  function formatTextWithMarkdown(text) {
    if (!text) return '';
    
    // First escape HTML
    let formatted = escapeHtml(text);
    
    // Handle triple stars: ***bold and navy blue***
    formatted = formatted.replace(/\*\*\*(.*?)\*\*\*/g, (match, content) => {
      return `<strong style="color: #001f3f; font-weight: 800;">${content}</strong>`;
    });
    
    // Handle double stars: **bold only**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      return `<strong>${content}</strong>`;
    });
    
    // Handle code blocks with language specification ```language\ncode\n```
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<div class="code-block">
                <div class="code-header">
                  <span class="code-lang">${language}</span>
                  <button class="copy-code-btn" data-code="${escapeHtml(code)}">Copy</button>
                </div>
                <pre><code class="language-${language}">${escapeHtml(code)}</code></pre>
              </div>`;
    });
    
    // Handle inline code: `code`
    formatted = formatted.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="inline-code">${escapeHtml(code)}</code>`;
    });
    
    // Handle headers: # Header, ## Subheader
    formatted = formatted.replace(/^### (.*$)/gm, '<h3 style="color: #3b82f6; margin: 12px 0 8px 0; font-size: 1.1em;">$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gm, '<h2 style="color: #8b5cf6; margin: 16px 0 10px 0; font-size: 1.2em; border-bottom: 1px solid rgba(139, 92, 246, 0.2); padding-bottom: 4px;">$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gm, '<h1 style="color: #22d3ee; margin: 20px 0 12px 0; font-size: 1.3em;">$1</h1>');
    
    // Handle lists
    formatted = formatted.replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin: 4px 0; padding-left: 4px;">$1</li>');
    formatted = formatted.replace(/^\s*\d+\.\s+(.+)$/gm, '<li style="margin: 4px 0; padding-left: 4px; list-style-type: decimal;">$1</li>');
    
    // Wrap lists in ul/ol
    const lines = formatted.split('\n');
    let inList = false;
    let listType = '';
    let resultLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('<li style="margin: 4px 0; padding-left: 4px;">')) {
        if (!inList) {
          inList = true;
          listType = 'ul';
          resultLines.push('<ul style="margin: 8px 0 12px 0; padding-left: 20px;">');
        }
        resultLines.push(line);
      } else if (line.includes('<li style="margin: 4px 0; padding-left: 4px; list-style-type: decimal;">')) {
        if (!inList || listType !== 'ol') {
          if (inList) resultLines.push(`</${listType}>`);
          inList = true;
          listType = 'ol';
          resultLines.push('<ol style="margin: 8px 0 12px 0; padding-left: 20px;">');
        }
        resultLines.push(line);
      } else {
        if (inList) {
          resultLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        resultLines.push(line);
      }
    }
    
    if (inList) {
      resultLines.push(`</${listType}>`);
    }
    
    formatted = resultLines.join('\n');
    
    // Handle paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.6;">');
    formatted = `<p style="margin: 8px 0; line-height: 1.6;">${formatted}</p>`;
    
    return formatted;
  }

  /* -------------------------
     DOM References
     ------------------------- */
  const askAiChat = el("askAiChat");
  const askAiInput = el("askAiInput");
  const sendBtn = el("sendBtnInside");
  const detailIndicator = el("detailIndicator");
  const detailControls = el("detailControls");
  const currentDetailLevel = el("currentDetailLevel");
  const aboutBtn = el("aboutBtn");
  const aboutModal = el("aboutModal");
  const closeAbout = el("closeAbout");
  const aiStatus = el("aiStatus");
  
  /* -------------------------
     App State
     ------------------------- */
  let conversation = []; // array of message objects {role, content, ts}
  let currentDetailMode = "detailed"; // Always start with detailed mode

  /* -------------------------
     History Management
     ------------------------- */
  function loadHistory() {
    try { 
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); 
    } catch (e) { 
      return []; 
    }
  }
  
  function saveHistory(arr) { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); 
  }
  
  function pushToHistory(msg) {
    const arr = loadHistory();
    arr.push(msg);
    while (arr.length > MAX_HISTORY) arr.shift();
    saveHistory(arr);
  }

  /* -------------------------
     Message Rendering
     ------------------------- */
  function makeMessageNode({role = "system", content = "", meta = {}}) {
    const node = document.createElement("div");
    node.className = "msg " + (role === "user" ? "user" : (role === "assistant" ? "ai" : "system"));
    
    // Format content based on role
    let formattedContent = content;
    if (role === "assistant") {
      formattedContent = formatTextWithMarkdown(content);
    } else if (role === "user") {
      formattedContent = escapeHtml(content).replace(/\n/g, '<br>');
    } else {
      formattedContent = escapeHtml(content).replace(/\n/g, '<br>');
    }
    
    // Create action buttons based on message type
    let actionButtons = '';
    if (role === 'user') {
      actionButtons = `
        <div class="msg-actions">
          <button class="copy-btn" title="Copy message">${copyIcon}</button>
        </div>
      `;
    } else if (role === 'assistant') {
      actionButtons = `
        <div class="msg-actions">
          <button class="copy-btn" title="Copy message">${copyIcon}</button>
          <button class="download-btn" title="Download as file">${downloadIcon}</button>
        </div>
      `;
    }
    
    const displayName = role === "user" ? "You" : 
                       role === "assistant" ? "Luminux AI" : "System";
    
    const timeStr = new Date(meta.ts || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    node.innerHTML = `
      <div class="msg-header">
        <span class="label">${displayName}</span>
        <div style="display:flex;align-items:center;gap:8px">
          <small>${timeStr}</small>
          ${actionButtons}
        </div>
      </div>
      <div class="msg-content">${formattedContent}</div>
    `;
    
    // Add copy functionality to code blocks
    if (role === 'assistant') {
      node.querySelectorAll('.copy-code-btn').forEach(button => {
        button.addEventListener('click', function() {
          const code = this.getAttribute('data-code');
          copyToClipboard(code);
          
          // Show feedback
          const originalText = this.textContent;
          this.textContent = 'Copied!';
          this.style.background = '#10b981';
          
          setTimeout(() => {
            this.textContent = originalText;
            this.style.background = '';
          }, 2000);
        });
      });
    }
    
    // Add event listeners to action buttons
    if (role === 'user' || role === 'assistant') {
      const copyBtn = node.querySelector('.copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          copyToClipboard(content);
          this.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>`;
          setTimeout(() => {
            this.innerHTML = copyIcon;
          }, 2000);
        });
      }
      
      const downloadBtn = node.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
          downloadAsFile(content, `luminux-${role}-${Date.now()}.txt`);
        });
      }
    }
    
    return node;
  }

  /* -------------------------
     Message Display Functions
     ------------------------- */
  function addMessage(text, type = "assistant") {
    const role = type === "user" ? "user" : 
                 type === "assistant" ? "assistant" : "system";
    
    const node = makeMessageNode({ 
      role, 
      content: text, 
      meta: { ts: Date.now() } 
    });
    
    if (askAiChat) {
      askAiChat.appendChild(node);
      scrollChatBottom(askAiChat);
    }
    
    // Add to conversation history if it's user or assistant message
    if (role === "user" || role === "assistant") {
      conversation.push({ role, content: text, ts: Date.now() });
    }
  }

  function addStatusMessage(text) {
    addMessage(text, "system");
  }

  /* -------------------------
     API Communication - ALWAYS DETAILED
     ------------------------- */
  function composeMessages(userMsg) {
    const messages = [];
    
    // ALWAYS USE DETAILED PROMPT - No matter what mode is selected
    const systemPrompt = `You are Kirabo Gatrude, a service provider at Malcom Finance, in everything you respond to the user, no matter how they approach you, you should never act like an AI chatbot, your responses should be human. You give answer for question, not details for a word, You're woman by Gender, 22years of age, live in Kampala, Uganda, But don't tell your location to users unless its needful. You're single, if a user asks to chat with you on Whatsapp, give them contact +256700559067, if they ask you to meet them in person, you should give reasonable excuses, Your answers should be brief, short and extra convincing. This is everything about Malcom Finance.`;
    
    messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: userMsg });
    
    return messages;
  }

  async function sendToGroqAPI(messages) {
    // If no valid API key, use simulated response
    if (!GROQ_API_KEY || GROQ_API_KEY.includes("YOUR_API_KEY")) {
      await new Promise((r) => setTimeout(r, 1000));
      // ALWAYS return detailed responses with formatting examples
      const detailedResponse = `I'll provide a detailed explanation for your question using the new formatting features:

***Main Concept:***
[Detailed explanation of the core concept]

**Step-by-Step Breakdown:**
1. [First key point with explanation]
2. [Second key point with examples]
3. [Third key point with practical applications]

**Examples & Code:**
\`\`\`javascript
// Example code demonstrating the concept
function detailedExample() {
  // Comprehensive code with comments
  console.log("Detailed explanation");
  return "Formatted response";
}
\`\`\`

**Best Practices:**
- [Best practice 1 with reasoning]
- [Best practice 2 with context]

**Common Pitfalls:**
- [Potential issue 1 and how to avoid it]
- [Potential issue 2 and solutions]

**Advanced Insights:**
[Additional technical depth and insights]

**Summary:**
[Comprehensive wrap-up of all points]

This detailed approach ensures you have a complete understanding of the topic. You can use \`inline code\` for short snippets or triple stars ***for important highlights***.`;
      
      return { success: true, text: detailedResponse };
    }

    try {
      const resp = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.3,
          max_tokens: 2500, // Always allow more tokens for detailed responses
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        return { success: false, error: `HTTP ${resp.status}: ${txt}` };
      }
      
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content || "(No response content)";
      return { success: true, text: text };
      
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  }

  /* -------------------------
     Main Send Function
     ------------------------- */
  window.sendMessage = async function() {
    if (!askAiInput) return;
    const userMsg = askAiInput.value.trim();
    if (!userMsg) {
      if (aiStatus) aiStatus.textContent = "Type a question first";
      return;
    }

    // Add user message to UI
    addMessage(userMsg, "user");

    // Save to history
    pushToHistory(userMsg);

    // Clear input
    askAiInput.value = "";
    askAiInput.style.height = 'auto';

    // Show thinking status
    if (aiStatus) aiStatus.textContent = "Crafting detailed response…";

    // Create loading indicator
    const loadingNode = document.createElement("div");
    loadingNode.className = "msg ai";
    loadingNode.innerHTML = `
      <div class="msg-header">
        <span class="label">Luminux AI</span>
        <small>${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
      </div>
      <div class="msg-content">
        <div class="thinking-indicator">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
          Preparing detailed analysis...
        </div>
      </div>
    `;
    
    if (askAiChat) {
      askAiChat.appendChild(loadingNode);
      scrollChatBottom(askAiChat);
    }

    // Compose messages and call API
    const messages = composeMessages(userMsg);
    const res = await sendToGroqAPI(messages);

    // Remove loading indicator
    if (loadingNode && loadingNode.parentNode) {
      loadingNode.remove();
    }
    
    // Display response or error
    if (res.success) {
      addMessage(res.text, "assistant");
    } else {
      addStatusMessage("Error: " + (res.error || "Unknown error"));
      if (aiStatus) aiStatus.textContent = "Error";
    }

    // Reset status
    if (aiStatus) aiStatus.textContent = "Ready for detailed questions";
  };

  /* -------------------------
     Detail Mode Handling - Simplified for Always Detailed
     ------------------------- */
  function setupDetailMode() {
    if (!detailIndicator || !detailControls || !currentDetailLevel) return;
    
    const detailOptions = document.querySelectorAll('.detail-option');
    
    // Set all options to disabled and highlight "detailed"
    detailOptions.forEach(option => {
      option.classList.remove('selected');
      option.style.opacity = '0.6';
      option.style.cursor = 'not-allowed';
      
      // Remove existing click handlers
      const newOption = option.cloneNode(true);
      option.parentNode.replaceChild(newOption, option);
    });
    
    // Force detailed mode
    const detailedOption = document.querySelector('.detail-option[data-level="detailed"]');
    if (detailedOption) {
      detailedOption.classList.add('selected');
      detailedOption.style.opacity = '1';
      currentDetailLevel.textContent = "Detailed";
      detailIndicator.title = "Luminux AI always provides detailed responses";
    }
    
    // Disable dropdown functionality
    detailIndicator.style.cursor = 'default';
    detailIndicator.title = "Luminux AI always provides detailed responses";
    
    // Replace click handler with informative message
    detailIndicator.addEventListener('click', function(e) {
      e.stopPropagation();
      addStatusMessage("Luminux AI is configured to always provide detailed, comprehensive responses.");
      
      // Briefly show dropdown for visual feedback
      detailControls.classList.add('active');
      detailIndicator.classList.add('active');
      
      setTimeout(() => {
        detailControls.classList.remove('active');
        detailIndicator.classList.remove('active');
      }, 1000);
    });
    
    // Show informative message about always detailed mode
    addStatusMessage("Luminux AI is configured to ALWAYS provide detailed, comprehensive responses.");
  }

  /* -------------------------
     Textarea Management
     ------------------------- */
  function setupTextareaResize() {
    if (!askAiInput) return;
    
    // Auto-resize
    askAiInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    
    // Enter key handling (send on Enter, newline on Shift+Enter)
    askAiInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        window.sendMessage();
      }
    });
    
    // Add placeholder encouraging detailed questions
    askAiInput.placeholder = "Message";
  }

  /* -------------------------
     Modal Management
     ------------------------- */
  function setupModal() {
    // About modal
    onIfExists(aboutBtn, "click", () => {
      if (!aboutModal) return;
      aboutModal.style.display = "flex";
      aboutModal.setAttribute("aria-hidden", "false");
    });
    
    onIfExists(closeAbout, "click", () => {
      if (!aboutModal) return;
      aboutModal.style.display = "none";
      aboutModal.setAttribute("aria-hidden", "true");
    });
    
    // Close modal when clicking outside
    if (aboutModal) {
      aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
          aboutModal.style.display = 'none';
          aboutModal.setAttribute("aria-hidden", "true");
        }
      });
    }
  }

  /* -------------------------
     Android Keyboard Fix
     ------------------------- */
  function setupAndroidKeyboardFix() {
    if (/Android/i.test(navigator.userAgent) && askAiInput) {
      askAiInput.addEventListener('focus', () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=0');
        }
      });
      
      askAiInput.addEventListener('blur', () => {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width,initial-scale=1,viewport-fit=cover');
        }
      });
    }
  }

  /* -------------------------
     Enhanced UI Features with Code Styling
     ------------------------- */
  function setupEnhancedUI() {
    // Add enhanced CSS for formatting
    const style = document.createElement('style');
    style.textContent = `
      .thinking-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #6b7280;
        font-style: italic;
      }
      .thinking-indicator .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #3b82f6;
        animation: pulse 1.5s infinite;
      }
      .thinking-indicator .dot:nth-child(2) {
        animation-delay: 0.2s;
      }
      .thinking-indicator .dot:nth-child(3) {
        animation-delay: 0.4s;
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 1; }
      }
      
      /* Code block styling */
      .code-block {
        background: #0f172a;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        margin: 12px 0;
        overflow: hidden;
        font-family: 'SF Mono', Monaco, 'Cascadia Mono', 'Consolas', monospace;
      }
      
      .code-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 12px;
        color: #94a3b8;
      }
      
      .code-lang {
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .copy-code-btn {
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #60a5fa;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .copy-code-btn:hover {
        background: rgba(59, 130, 246, 0.25);
      }
      
      .code-block pre {
        margin: 0;
        padding: 14px;
        overflow-x: auto;
        background: transparent;
        border: none;
        border-radius: 0;
        font-size: 13px;
        line-height: 1.5;
        tab-size: 2;
      }
      
      .code-block code {
        background: transparent;
        padding: 0;
        border-radius: 0;
        color: #e2e8f0;
        font-family: inherit;
        font-size: inherit;
      }
      
      /* Syntax highlighting */
      .language-javascript .token.keyword { color: #f472b6; }
      .language-javascript .token.string { color: #34d399; }
      .language-javascript .token.number { color: #fbbf24; }
      .language-javascript .token.function { color: #60a5fa; }
      .language-javascript .token.comment { color: #64748b; font-style: italic; }
      .language-javascript .token.operator { color: #c084fc; }
      .language-javascript .token.punctuation { color: #cbd5e1; }
      
      .language-python .token.keyword { color: #f472b6; }
      .language-python .token.string { color: #34d399; }
      .language-python .token.number { color: #fbbf24; }
      .language-python .token.function { color: #60a5fa; }
      .language-python .token.comment { color: #64748b; font-style: italic; }
      
      .language-html .token.tag { color: #f472b6; }
      .language-html .token.attr-name { color: #60a5fa; }
      .language-html .token.attr-value { color: #34d399; }
      
      .language-css .token.property { color: #60a5fa; }
      .language-css .token.value { color: #34d399; }
      .language-css .token.selector { color: #f472b6; }
      
      /* Inline code */
      .inline-code {
        background: rgba(59, 130, 246, 0.1);
        color: #93c5fd;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, 'Cascadia Mono', 'Consolas', monospace;
        font-size: 0.9em;
        border: 1px solid rgba(59, 130, 246, 0.2);
      }
      
      /* Message content styling */
      .msg-content {
        line-height: 1.6;
      }
      
      .msg-content p {
        margin: 8px 0;
      }
      
      .msg-content strong {
        font-weight: 700;
      }
      
      /* Scrollbar for code blocks */
      .code-block pre::-webkit-scrollbar {
        height: 8px;
      }
      
      .code-block pre::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      }
      
      .code-block pre::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      
      .code-block pre::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.25);
      }
    `;
    document.head.appendChild(style);
    
    // Update AI status
    if (aiStatus) {
      aiStatus.textContent = "Ready for detailed questions";
    }
  }

  /* -------------------------
     Export Functions
     ------------------------- */
  function exportConversation() {
    const blob = new Blob([JSON.stringify(conversation, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `luminux-detailed-conversation-${nowStamp().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /* -------------------------
     Expose Functions to Window
     ------------------------- */
  window.addMessage = addMessage;
  window.addStatusMessage = addStatusMessage;
  window.getAIStatus = function() { return aiStatus; };
  
  window.getAIResponse = function(message) {
    // Update status
    if (aiStatus) aiStatus.textContent = "Crafting detailed response...";
    
    // Simulate detailed response with formatting examples
    setTimeout(() => {
      const detailedResponse = `As Luminux AI, I'll provide a comprehensive answer to your question using enhanced formatting:

***Core Analysis:***
[In-depth analysis of your question with navy blue bold text]

**Detailed Breakdown:**
1. [First comprehensive point]
2. [Second detailed explanation with examples]
3. [Third aspect with practical applications]

**Technical Details:**
[Technical specifications and considerations]

**Implementation Guide:**
\`\`\`javascript
// Example implementation
function enhancedFormatting() {
  // This shows code block formatting
  const important = "***This is important***";
  const code = \`console.log("\${important}")\`;
  return code;
}
\`\`\`

You can also use \`inline code\` for quick snippets or **regular bold** for emphasis.

**Best Practices & Recommendations:**
[Industry best practices and optimization tips]

This detailed approach ensures you have complete understanding and actionable insights.`;
      
      addMessage(detailedResponse, 'assistant');
      if (aiStatus) aiStatus.textContent = 'Ready for detailed questions';
    }, 1500);
  };

  /* -------------------------
     Event Listeners
     ------------------------- */
  function setupEventListeners() {
    // Send button
    onIfExists(sendBtn, "click", (e) => { 
      e.preventDefault(); 
      window.sendMessage(); 
    });
    
    // Initialize various components
    setupDetailMode();
    setupTextareaResize();
    setupModal();
    setupAndroidKeyboardFix();
    setupEnhancedUI();
  }

  /* -------------------------
     Initialization
     ------------------------- */
  function init() {
    setupEventListeners();
    
    // Show welcome message emphasizing detailed responses
    addStatusMessage("Welcome to Luminux AI v4 — Configured for DETAILED responses only!");
    addStatusMessage("Every answer will include comprehensive explanations, examples, and insights.");
    addStatusMessage("Ask complex questions to get the most value from this detailed AI assistant.");
    
    // Show formatting example
    setTimeout(() => {
      addMessage("Try asking a question! Responses will include ***navy blue bold text***, **regular bold**, `inline code`, and formatted code blocks.", "system");
    }, 1000);
  }

  // Run initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
