function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params.entries()) {
        result[key] = decodeURIComponent(value);
    }
    return result;
}

function autoFillReferralFromURL() {
    const params = getQueryParams();
    
    if (params.ref) {
        const referralInput = document.getElementById('register-referral');
        if (referralInput) {
            referralInput.value = params.ref;
        }
        
        const loginModal = document.getElementById('login-modal');
        if (loginModal && loginModal.style.display === 'flex') {
            showRegisterForm();
        }
    }
}

function generateReferralLink(referralCode) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?ref=${encodeURIComponent(referralCode)}`;
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(autoFillReferralFromURL, 100);
});

const LOCK_STORAGE_KEY = 'malcom_finance_lock';
const DEFAULT_LOCK_SETTINGS = {enabled: false, passcode: null, question: null, answer: null};
let lockSettings = {...DEFAULT_LOCK_SETTINGS};
let lockScreenActive = false;
let setupPin = '';
let setupStep = 1;
let firstPasscode = '';

function loadLockSettings() {
    try {
        const saved = localStorage.getItem(LOCK_STORAGE_KEY);
        if (saved) lockSettings = JSON.parse(saved);
    } catch (e) {
        console.error('Lock load error:', e);
        lockSettings = {...DEFAULT_LOCK_SETTINGS};
    }
}

function saveLockSettings() {
    try {
        localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(lockSettings));
    } catch (e) {
        console.error('Lock save error:', e);
    }
}

function initializeLockFeature() {
    loadLockSettings();
    createLockUI();
    addSecurityToAccountPage();
    
    if (lockSettings.enabled && !isSecurityPage()) {
        setTimeout(showLockScreen, 300);
    }
}

function createLockUI() {
    const lockHTML = `
        <div id="lock-screen-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000 url('assets/lock.png') no-repeat center center; background-size: cover; z-index: 99999;">
            <div class="pin-container" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 400px;">
              <br><br><br>  <div class="title">Enter Passcode</div>
                <div class="display">
                    <div class="pin-circle" id="lock-circle1"></div>
                    <div class="pin-circle" id="lock-circle2"></div>
                    <div class="pin-circle" id="lock-circle3"></div>
                    <div class="pin-circle" id="lock-circle4"></div>
                </div>
                <div class="keypad">
                    <div class="keyrow">
                        <div class="key" data-value="1">1</div>
                        <div class="key" data-value="2">2</div>
                        <div class="key" data-value="3">3</div>
                    </div>
                    <div class="keyrow">  
                        <div class="key" data-value="4">4</div>
                        <div class="key" data-value="5">5</div>
                        <div class="key" data-value="6">6</div>
                    </div>
                    <div class="keyrow">
                        <div class="key" data-value="7">7</div>
                        <div class="key" data-value="8">8</div>
                        <div class="key" data-value="9">9</div>
                    </div>
                    <div class="keyrow">
                        <div class="key" data-value="0">0</div>
                    </div>
                </div>
                <div class="status" id="lock-status"></div>
                <p style="Font-weight: 900; color: white; backdrop-filter: blur(20px); padding: 10px 30px; border-radius: 50px; border: 1px solid white;" onclick="showForgotPasscodeFromLock()">Forgot Password</p>
                <div style="margin-top: 30px; text-align: center;">
                    <button onclick="showForgotPasscodeFromLock()" style="background: none; border: none; color: #6ab8ff; font-size: 14px; cursor: pointer; padding: 10px;">
                        <i class="fas fa-unlock-alt"></i> Forgot Passcode?
                    </button>
                </div>
            </div>
        </div>
        
        <div id="security-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <button class="close-btn" onclick="closeModal('security-modal')">&times;</button>
                <h3>Security Settings</h3>
                <div style="margin: 20px 0; padding: 15px; background: rgba(106, 184, 255, 0.1); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="color: white; font-weight: bold;">Passcode Lock</span>
                        <label class="switch">
                            <input type="checkbox" id="passcode-toggle" onchange="togglePasscodeLock(this.checked)">
                            <span class="slider round"></span>
                        </label>
                    </div>
                    <p style="color: #ccc; font-size: 14px; margin: 0;">
                        ${lockSettings.enabled ? 'Passcode is ON. Required to access app.' : 'Passcode is OFF. Turn on to secure app.'}
                    </p>
                </div>
                <div style="margin: 25px 0;">
                    <button class="modal-btn secondary" onclick="showChangePasscodeModal()" ${!lockSettings.enabled ? 'disabled' : ''} style="${!lockSettings.enabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                        <i class="fas fa-key"></i> Change Passcode
                    </button>
                    <button class="modal-btn secondary" onclick="showSecurityQuestionModal()" style="margin-top: 10px;">
                        <i class="fas fa-question-circle"></i> ${lockSettings.question ? 'Change Security Question' : 'Set Security Question'}
                    </button>
                    <button class="modal-btn" onclick="forgotPasscode()" ${!lockSettings.enabled ? 'disabled' : ''} style="margin-top: 10px; background: #ff6b6b; ${!lockSettings.enabled ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                        <i class="fas fa-unlock-alt"></i> Forgot Passcode?
                    </button>
                </div>
            </div>
        </div>
        
        <div id="set-passcode-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <button class="close-btn" onclick="closeModal('set-passcode-modal'); resetSetup();">&times;</button>
                <h3>Set Passcode</h3>
                <div style="margin: 20px 0; text-align: center;">
                    <p style="color: #ccc; margin-bottom: 20px;" id="passcode-instruction">Enter your new 4-digit passcode</p>
                    <div class="pin-container" style="margin: 30px auto; max-width: 300px;">
                        <div class="display">
                            <div class="pin-circle" id="setup-circle1"></div>
                            <div class="pin-circle" id="setup-circle2"></div>
                            <div class="pin-circle" id="setup-circle3"></div>
                            <div class="pin-circle" id="setup-circle4"></div>
                        </div>
                        <div class="keypad">
                            <div class="keyrow">
                                <div class="key" data-value="1">1</div>
                                <div class="key" data-value="2">2</div>
                                <div class="key" data-value="3">3</div>
                            </div>
                            <div class="keyrow">  
                                <div class="key" data-value="4">4</div>
                                <div class="key" data-value="5">5</div>
                                <div class="key" data-value="6">6</div>
                            </div>
                            <div class="keyrow">
                                <div class="key" data-value="7">7</div>
                                <div class="key" data-value="8">8</div>
                                <div class="key" data-value="9">9</div>
                            </div>
                            <div class="keyrow">
                                <div class="key" data-value="0">0</div>
                            </div>
                        </div>
                        <div class="status" id="setup-status"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="security-question-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <button class="close-btn" onclick="closeModal('security-question-modal')">&times;</button>
                <h3>Security Question</h3>
                <p style="color: #ccc; margin-bottom: 20px;">Set a security question for passcode recovery.</p>
                <div class="form-group">
                    <label>Select a question:</label>
                    <select id="question-select" class="modal-input" onchange="toggleCustomQuestion()">
                        <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                        <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                        <option value="What city were you born in?">What city were you born in?</option>
                        <option value="What is your favorite book?">What is your favorite book?</option>
                        <option value="custom">Create custom question</option>
                    </select>
                </div>
                <div class="form-group" id="custom-question-group" style="display: none;">
                    <label>Your custom question:</label>
                    <input type="text" id="custom-question" class="modal-input" placeholder="Enter your security question">
                </div>
                <div class="form-group">
                    <label>Your answer:</label>
                    <input type="text" id="security-answer" class="modal-input" placeholder="Enter your answer">
                </div>
                <div class="form-group">
                    <label>Confirm answer:</label>
                    <input type="text" id="confirm-answer" class="modal-input" placeholder="Enter answer again">
                </div>
                <div id="question-error" class="validation-error" style="display: none;"></div>
                <button class="modal-btn" onclick="saveSecurityQuestion()">Save Security Question</button>
            </div>
        </div>
        
        <div id="forgot-passcode-modal" class="modal" style="display: none;">
            <div class="modal-content">
                <button class="close-btn" onclick="closeModal('forgot-passcode-modal'); window.location='index.html'">&times;</button>
                <h3>Reset Passcode</h3>
                <div style="margin: 20px 0; padding: 15px; background: rgba(255, 107, 107, 0.1); border-radius: 8px;">
                    <p style="color: #ffc107; margin: 0;">Answer security question to reset passcode.</p>
                </div>
                <div class="form-group">
                    <label id="forgot-question-label">${lockSettings.question || 'Security Question'}</label>
                </div>
                <div class="form-group">
                    <label>Your answer:</label>
                    <input type="text" id="forgot-answer" class="modal-input" placeholder="Enter your answer">
                </div>
                <div id="forgot-error" class="validation-error" style="display: none;"></div>
                <button class="modal-btn" onclick="verifySecurityAnswer()">Verify Answer</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', lockHTML);
    initializeLockScreen();
    initializeSetupScreen();
}

function addSecurityToAccountPage() {
    const accountPage = document.getElementById('nav-menu');
    if (accountPage) {
        const buttons = accountPage.querySelector('nav-links');
        if (buttons) {
            const securityBtn = document.createElement('a');
            securityBtn.className = 'white';
            securityBtn.style.marginTop = '10px';
            securityBtn.onclick = showSecuritySettingsModal;
            securityBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Security';
            buttons.parentNode.insertBefore(securityBtn, buttons.nextSibling);
        }
    }
}

function showSecuritySettingsModal() {
    updateSecurityModal();
    showModal('security-modal');
}

function updateSecurityModal() {
    const toggle = document.getElementById('passcode-toggle');
    if (toggle) toggle.checked = lockSettings.enabled;
    const statusText = document.querySelector('#security-modal p[style*="color: #ccc"]');
    if (statusText) {
        statusText.textContent = lockSettings.enabled 
            ? 'Passcode is ON. Required to access app.' 
            : 'Passcode is OFF. Turn on to secure app.';
    }
}

function togglePasscodeLock(enabled) {
    if (enabled) {
        if (!lockSettings.passcode) {
            showSetPasscodeModal();
            document.getElementById('passcode-toggle').checked = false;
            return;
        }
        lockSettings.enabled = true;
        saveLockSettings();
        alert('Passcode lock is now ON. Required to access app.');
    } else {
        const entered = prompt('Enter passcode to turn off lock:');
        if (entered === lockSettings.passcode) {
            lockSettings.enabled = false;
            saveLockSettings();
            alert('Passcode lock is now OFF.');
        } else {
            document.getElementById('passcode-toggle').checked = true;
            alert('Incorrect passcode.');
            return;
        }
    }
    updateSecurityModal();
}

function showSetPasscodeModal() {
    resetSetup();
    showModal('set-passcode-modal');
}

function resetSetup() {
    setupPin = '';
    setupStep = 1;
    firstPasscode = '';
    updateSetupCircles();
    document.getElementById('setup-status').textContent = '';
    document.getElementById('passcode-instruction').textContent = 'Enter your new 4-digit passcode';
    document.getElementById('setup-status').className = 'status';
}

function updateSetupCircles() {
    for (let i = 1; i <= 4; i++) {
        const circle = document.getElementById(`setup-circle${i}`);
        if (circle) circle.classList.toggle('filled', i <= setupPin.length);
    }
}

function initializeSetupScreen() {
    setTimeout(() => {
        const setupKeys = document.querySelectorAll('#set-passcode-modal .key');
        setupKeys.forEach(key => {
            key.addEventListener('click', (e) => {
                const value = key.dataset.value;
                handleSetupDigit(value);
            });
            key.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const value = key.dataset.value;
                handleSetupDigit(value);
            }, { passive: false });
        });
    }, 100);
}

function handleSetupDigit(digit) {
    if (setupPin.length < 4) {
        setupPin += digit;
        updateSetupCircles();
        if (setupPin.length === 4) {
            if (setupStep === 1) {
                firstPasscode = setupPin;
                setupPin = '';
                setupStep = 2;
                document.getElementById('passcode-instruction').textContent = 'Confirm your passcode';
                updateSetupCircles();
                document.getElementById('setup-status').textContent = 'Now confirm your passcode';
                document.getElementById('setup-status').className = 'status';
            } else if (setupStep === 2) {
                if (setupPin === firstPasscode) {
                    document.getElementById('setup-status').textContent = 'Passcode set!';
                    document.getElementById('setup-status').className = 'status success';
                    lockSettings.passcode = setupPin;
                    saveLockSettings();
                    setTimeout(() => {
                        closeModal('set-passcode-modal');
                        if (!lockSettings.question) {
                            showSecurityQuestionModal();
                        } else {
                            alert('Passcode set! Enable lock in Security settings.');
                            updateSecurityModal();
                        }
                    }, 1000);
                } else {
                    document.getElementById('setup-status').textContent = 'Passcodes do not match.';
                    document.getElementById('setup-status').className = 'status error';
                    setTimeout(resetSetup, 1500);
                }
            }
        }
    }
}

function showSecurityQuestionModal() {
    if (lockSettings.question) {
        document.getElementById('question-select').value = 'custom';
        document.getElementById('custom-question').value = lockSettings.question;
        toggleCustomQuestion();
    } else {
        document.getElementById('question-select').value = 'What is your mother\'s maiden name?';
    }
    document.getElementById('security-answer').value = '';
    document.getElementById('confirm-answer').value = '';
    document.getElementById('question-error').style.display = 'none';
    showModal('security-question-modal');
}

function toggleCustomQuestion() {
    const select = document.getElementById('question-select');
    const customGroup = document.getElementById('custom-question-group');
    customGroup.style.display = select.value === 'custom' ? 'block' : 'none';
}

function saveSecurityQuestion() {
    const select = document.getElementById('question-select');
    const customQuestion = document.getElementById('custom-question').value.trim();
    const answer = document.getElementById('security-answer').value.trim();
    const confirmAnswer = document.getElementById('confirm-answer').value.trim();
    const errorDiv = document.getElementById('question-error');
    
    let question = '';
    if (select.value === 'custom') {
        if (!customQuestion) {
            errorDiv.textContent = 'Enter a security question';
            errorDiv.style.display = 'block';
            return;
        }
        question = customQuestion;
    } else {
        question = select.value;
    }
    
    if (!answer) {
        errorDiv.textContent = 'Enter an answer';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (answer !== confirmAnswer) {
        errorDiv.textContent = 'Answers do not match';
        errorDiv.style.display = 'block';
        return;
    }
    
    lockSettings.question = question;
    lockSettings.answer = answer.toLowerCase();
    saveLockSettings();
    alert('Security question saved!');
    closeModal('security-question-modal');
    updateSecurityModal();
}

function forgotPasscode() {
    if (!lockSettings.question) {
        alert('No security question set. Set one first.');
        showSecurityQuestionModal();
        return;
    }
    document.getElementById('forgot-question-label').textContent = lockSettings.question;
    document.getElementById('forgot-answer').value = '';
    document.getElementById('forgot-error').style.display = 'none';
    closeModal('security-modal');
    showModal('forgot-passcode-modal');
}

function showForgotPasscodeFromLock() {
    hideLockScreen();
    showModal('forgot-passcode-modal');
}

function verifySecurityAnswer() {
    const answer = document.getElementById('forgot-answer').value.trim().toLowerCase();
    const errorDiv = document.getElementById('forgot-error');
    
    if (!answer) {
        errorDiv.textContent = 'Enter your answer';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (answer === lockSettings.answer) {
        closeModal('forgot-passcode-modal');
        lockSettings.passcode = null;
        lockSettings.enabled = false;
        saveLockSettings();
        alert('Passcode reset! Set a new passcode in Security settings.');
        showSetPasscodeModal();
    } else {
        errorDiv.textContent = 'Incorrect answer. Try again.';
        errorDiv.style.display = 'block';
    }
}

function showChangePasscodeModal() {
    if (!lockSettings.enabled || !lockSettings.passcode) {
        alert('Enable passcode lock first.');
        return;
    }
    const current = prompt('Enter current passcode:');
    if (!current) return;
    if (current !== lockSettings.passcode) {
        alert('Incorrect passcode.');
        return;
    }
    showSetPasscodeModal();
}

function showLockScreen() {
    lockScreenActive = true;
    document.getElementById('lock-screen-overlay').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function hideLockScreen() {
    lockScreenActive = false;
    document.getElementById('lock-screen-overlay').style.display = 'none';
    document.body.style.overflow = '';
}

function isSecurityPage() {
    return document.querySelector('.modal[style*="display: flex"]') || window.location.href.includes('security');
}

function initializeLockScreen() {
    let lockPin = '';
    
    function clearLockState() {
        lockPin = '';
        updateLockCircles();
        document.getElementById('lock-status').textContent = '';
        document.getElementById('lock-status').className = 'status';
    }
    
    function updateLockCircles() {
        for (let i = 1; i <= 4; i++) {
            const circle = document.getElementById(`lock-circle${i}`);
            if (circle) circle.classList.toggle('filled', i <= lockPin.length);
        }
    }
    
    function handleLockDigit(digit) {
        if (lockPin.length < 4) {
            lockPin += digit;
            updateLockCircles();
            if (lockPin.length === 4) {
                if (lockPin === lockSettings.passcode) {
                    document.getElementById('lock-status').textContent = 'UNLOCKED';
                    document.getElementById('lock-status').className = 'status success';
                    setTimeout(() => {
                        hideLockScreen();
                        clearLockState();
                    }, 500);
                } else {
                    vibrate();
                    document.getElementById('lock-status').textContent = 'Wrong passcode. Try again.';
                    document.getElementById('lock-status').className = 'status error';
                    setTimeout(clearLockState, 1500);
                }
            }
        }
    }
    
    setTimeout(() => {
        const lockKeys = document.querySelectorAll('#lock-screen-overlay .key');
        lockKeys.forEach(key => {
            key.addEventListener('click', (e) => {
                if (lockScreenActive) {
                    const value = key.dataset.value;
                    handleLockDigit(value);
                }
            });
            key.addEventListener('touchstart', (e) => {
                if (lockScreenActive) {
                    e.preventDefault();
                    const value = key.dataset.value;
                    handleLockDigit(value);
                }
            }, { passive: false });
        });
    }, 100);
}

function vibrate() {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeLockFeature, 500);
});

const navMenu = document.getElementById('nav-menu');
const closeMenu = document.getElementById('close-menu');

let startX = 0;
let startY = 0;
let currentX = 0;

document.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

document.addEventListener('touchmove', function(e) {
    if (!startX || !startY) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    const diffX = startX - currentX;
    const diffY = startY - currentY;
    
    if (Math.abs(diffX) > Math.abs(diffY) && diffX > 50 && startX > window.innerWidth - 50) {
        navMenu.classList.add('open');
        startX = null;
        startY = null;
    }
});

navMenu.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
});

navMenu.addEventListener('touchmove', function(e) {
    if (!startX) return;
    
    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    
    if (diffX > 50) {
        navMenu.classList.remove('open');
        startX = null;
    }
});

const canvas = document.getElementById('background-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function showCard() {
    const card = document.getElementById('imfor');
    const showButton = document.getElementById('cardshow');
    const hideButton = document.getElementById('cardhide');
    
    card.classList.add('expanded');
    showButton.style.display = 'none';
    hideButton.style.display = 'block';
}

function hideCard() {
    const card = document.getElementById('imfor');
    const showButton = document.getElementById('cardshow');
    const hideButton = document.getElementById('cardhide');
    
    card.classList.remove('expanded');
    hideButton.style.display = 'none';
    
    setTimeout(() => {
        if (!card.classList.contains('expanded')) {
            showButton.style.display = 'block';
        }
    }, 800);
}

function updateCardDetailsImmediately() {
    if (!userData) {
        console.log("User data not available yet");
        return;
    }
    
    console.log("Updating card details with:", userData);
    
    const cardElements = {
        'account-name': userData.name || 'N/A',
        'account-email': userData.email || 'N/A',
        'account-status': userData.isActive ? 'Active' : 'Inactive',
        'account-phone': userData.phone || 'N/A',
        'user-referral': userData.referralCode || 'N/A',
        'total-referrals': userData.referrals || 0,
        'join-date': userData.createdAt ? 
            new Date(userData.createdAt).toLocaleDateString() : 'N/A'
    };
    
    Object.keys(cardElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = cardElements[id];
        } else {
            console.warn(`Element with id "${id}" not found in card`);
        }
    });
}

function enhanceUpdateUI() {
    const originalUpdateUI = window.updateUI;
    
    window.updateUI = function() {
        if (originalUpdateUI) {
            originalUpdateUI();
        }
        
        updateCardDetailsImmediately();
        updateAccountPageDetails();
    };
}

function updateAccountPageDetails() {
    if (!userData) return;
    
    const elements = {
        'account-page-name': userData.name || 'N/A',
        'account-page-email': userData.email || 'N/A',
        'account-page-phone': userData.phone || 'N/A',
        'account-page-status': userData.isActive ? 'Active' : 'Inactive',
        'account-page-referral': userData.referralCode || 'N/A',
        'account-page-total-referrals': userData.referrals || 0,
        'account-page-join-date': userData.createdAt ? 
            new Date(userData.createdAt).toLocaleDateString() : 'N/A'
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    enhanceUpdateUI();
    
    if (window.auth) {
        window.auth.onAuthStateChanged(async (user) => {
            if (user) {
                setTimeout(updateCardDetailsImmediately, 1000);
                setTimeout(updateAccountPageDetails, 1000);
            }
        });
    }
});

async function shareInvitation() {
    if (!userData || !userData.referralCode || !userData.name) {
        alert("Please login to use the share feature.");
        showLoginModal();
        return;
    }
    
    const shareText = `Hi, I invite you to Malcom Finance, work-from-home and become a person of your dreams, visit http://www.malcomfinance.gt.tc/?ref=${userData.referralCode} to register.\nYours, ${userData.name}`;
    const shareUrl = `http://www.malcomfinance.gt.tc/?ref=${userData.referralCode}`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Join Malcom Finance',
                text: shareText,
                url: shareUrl
            });
            return;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.log('Web Share failed, falling back to other methods:', error);
            }
        }
    }
    
    const whatsappText = encodeURIComponent(shareText);
    const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
    
    try {
        await navigator.clipboard.writeText(shareText);
        
        const choice = confirm(`Link copied to clipboard!\n\n${shareText}\n\nDo you want to open WhatsApp to share it?`);
        
        if (choice) {
            window.open(whatsappUrl, '_blank');
        } else {
            alert("Link copied! You can now paste it anywhere:\n\n" + shareText);
        }
    } catch (clipboardError) {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                const openWhatsApp = confirm(`Link copied to clipboard!\n\n${shareText}\n\nOpen WhatsApp to share?`);
                if (openWhatsApp) {
                    window.open(whatsappUrl, '_blank');
                }
            } else {
                prompt("Copy this invitation text manually:", shareText);
            }
        } catch (oldClipboardError) {
            prompt("Please copy this invitation text:", shareText);
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

const style = document.createElement('style');
style.textContent = `
    button:active {
        transform: scale(0.98);
    }
    
    @media (max-width: 768px) {
        #b-button {
            padding: 8px !important;
            font-size: 10px !important;
        }
    }
`;
document.head.appendChild(style);

const list = document.querySelectorAll('.list');

function activeLink() {
    list.forEach((item) => item.classList.remove('active'));
    this.classList.add('active');
}
list.forEach((item) => item.addEventListener('click', activeLink));

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('login-password');
    const toggleCheckbox = document.querySelector('span input[type="checkbox"]');
    
    if (passwordInput && toggleCheckbox) {
        toggleCheckbox.addEventListener('change', function() {
            passwordInput.type = this.checked ? 'text' : 'password';
        });
    }
});

const firebaseConfig = {
    apiKey: "AIzaSyAJaFVETxpy8Vr5e6RXDWi3NBhEUaZEPN4",
    authDomain: "malcolm-finance.firebaseapp.com",
    projectId: "malcolm-finance",
    storageBucket: "malcolm-finance.firebasestorage.app",
    messagingSenderId: "987613399580",
    appId: "1:987613399580:web:0237b2c8c2c7df54222dd9",
    measurementId: "G-1CEG3BWFBP"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
window.auth = auth;
window.db = db;
window.storage = storage;

let currentUser = null;
let userData = null;
let allTransactions = [];
let pendingWithdrawalData = null;
let cropper = null;
let todayActivities = null;
let todaysQuote = null;

const INVALID_EMAIL_PATTERNS = [
    /^user@/i,
    /^johndoe@/i,
    /^janedoe@/i,
    /^example@/i,
    /^test@/i,
    /^demo@/i,
    /^fake@/i,
    /^temp@/i,
    /^admin@/i,
    /^info@/i,
    /^contact@/i,
    /^hello@/i,
    /^hi@/i,
    /^mail@/i,
    /^email@/i,
    /^webmaster@/i,
    /^root@/i,
    /^noreply@/i,
    /^no-reply@/i,
    /^postmaster@/i,
    /^hostmaster@/i,
    /^abuse@/i,
    /^webadmin@/i
];

const INVALID_EMAIL_DOMAINS = [
    'example.com',
    'test.com',
    'fake.com',
    'demo.com',
    'temp.com',
    'mailinator.com',
    'guerrillamail.com',
    '10minutemail.com',
    'tempmail.com',
    'yopmail.com',
    'trashmail.com',
    'disposable.com'
];

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTodayDate() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[now.getDay()];
    const monthName = months[now.getMonth()];
    const date = now.getDate();
    const year = now.getFullYear();
    
    return `${dayName}, ${monthName} ${date}, ${year}`;
}

function showLoginForm() {
    document.getElementById('login-form').classList.add('active');
    document.getElementById('register-form').classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('register-form').classList.add('active');
    document.getElementById('login-form').classList.remove('active');
}

function validateUsername(name) {
    const regex = /^[a-zA-Z0-9\s]+$/;
    if (!name || name.trim().length < 2) {
        return { valid: false, message: "Please enter a valid name (minimum 2 characters)" };
    }
    if (name.length > 50) {
        return { valid: false, message: "Name is too long (maximum 50 characters)" };
    }
    if (!regex.test(name)) {
        return { valid: false, message: "Name can only contain letters, numbers, and spaces" };
    }
    return { valid: true, message: "" };
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email || !emailRegex.test(email)) {
        return { valid: false, message: "Please enter a valid email address" };
    }
    
    for (const pattern of INVALID_EMAIL_PATTERNS) {
        if (pattern.test(email)) {
            return { valid: false, message: "Please use a real email address" };
        }
    }
    
    const domain = email.split('@')[1].toLowerCase();
    if (INVALID_EMAIL_DOMAINS.includes(domain)) {
        return { valid: false, message: "Please use a real email provider" };
    }
    
    if (email.includes('..') || email.includes('--') || email.includes('__')) {
        return { valid: false, message: "Email address looks suspicious" };
    }
    
    return { valid: true, message: "" };
}

async function loadTodaysActivities() {
    if (!currentUser) return;
    
    const todayDate = getTodayDateString();
    const dateDisplay = document.getElementById('today-date-display');
    const quoteContainer = document.getElementById('quote-container');
    const quoteText = document.getElementById('quote-of-the-day');
    const quoteAuthor = document.getElementById('quote-author-name');
    const activitiesLoading = document.getElementById('activities-loading');
    const noActivitiesMessage = document.getElementById('no-activities-message');
    const todayActivitiesBtn = document.getElementById('today-activities-btn');
    
    dateDisplay.textContent = formatTodayDate();
    
    try {
        const doc = await db.collection('daily_activities').doc(todayDate).get();
        
        if (doc.exists) {
            const data = doc.data();
            todayActivities = data.activities || [];
            todaysQuote = data.quote || { text: "The best time to start was yesterday. The next best time is now.", author: "Icii White" };
            
            quoteText.textContent = `${todaysQuote.text}`;
            quoteAuthor.textContent = `${todaysQuote.author}`;
            quoteContainer.style.display = 'block';
            
            activitiesLoading.style.display = 'none';
            noActivitiesMessage.style.display = 'none';
            
            if (userData && userData.isActive) {
                todayActivitiesBtn.disabled = false;
                todayActivitiesBtn.innerHTML = ' Today\'s Activities';
            } else {
                todayActivitiesBtn.disabled = true;
                todayActivitiesBtn.innerHTML = '<i class="fas fa-lock"></i> Account Not Activated';
            }
            
        } else {
            todaysQuote = { text: "The best time to start was yesterday. The next best time is now.", author: "Icii White" };
            
            quoteText.textContent = `${todaysQuote.text}`;
            quoteAuthor.textContent = `${todaysQuote.author}`;
            quoteContainer.style.display = 'block';
            
            activitiesLoading.style.display = 'none';
            noActivitiesMessage.style.display = 'block';
            
            todayActivitiesBtn.disabled = true;
            todayActivitiesBtn.innerHTML = '<i class="fas fa-calendar-times"></i> No Activities Today';
        }
        
    } catch (error) {
        console.error("Error loading today's activities:", error);
        
        todaysQuote = { text: "The best time to start was yesterday. The next best time is now.", author: "Icii White" };
        quoteText.textContent = `${todaysQuote.text}`;
        quoteAuthor.textContent = `${todaysQuote.author}`;
        quoteContainer.style.display = 'block';
        
        activitiesLoading.style.display = 'none';
        noActivitiesMessage.style.display = 'block';
        noActivitiesMessage.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Activities</h3>
            <p>Please try again later</p>
        `;
        
        todayActivitiesBtn.disabled = true;
        todayActivitiesBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Error Loading';
    }
}

function goToDailyActivities() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    
    if (!userData || !userData.isActive) {
        alert('Please activate your account to access today\'s activities. Make a deposit to activate your account.');
        showDepositModal();
        return;
    }
    
    if (!todayActivities || todayActivities.length === 0) {
        alert('No activities available for today. Please check back tomorrow!');
        return;
    }
    
    window.location.href = 'customer-care.html';
}

async function loadProfilePicture() {
    if (!currentUser) return;
    
    try {
        const storageKey = `profile_picture_${currentUser.uid}`;
        const savedImage = localStorage.getItem(storageKey);
        
        if (savedImage) {
            document.getElementById('account-profile-pic').src = savedImage;
            return;
        }
        
        if (userData && userData.profilePictureUrl) {
            document.getElementById('account-profile-pic').src = userData.profilePictureUrl;
            localStorage.setItem(storageKey, userData.profilePictureUrl);
            return;
        }
        
        const storageRef = storage.ref(`profile_pictures/${currentUser.uid}`);
        const url = await storageRef.getDownloadURL();
        
        if (url) {
            document.getElementById('account-profile-pic').src = url;
            localStorage.setItem(storageKey, url);
            
            await db.collection('users').doc(currentUser.uid).update({
                profilePictureUrl: url
            });
        }
    } catch (error) {
        console.log("No profile picture found, using default");
        document.getElementById('account-profile-pic').src = 'ol3.png';
    }
}

function showProfilePictureModal() {
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('image-input').value = '';
    document.getElementById('save-profile-btn').disabled = true;
    showModal('profile-picture-modal');
}

function loadImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
    }
    
    if (!file.type.match('image.*')) {
        alert("Please select an image file");
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(preview, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            movable: true,
            zoomable: true,
            rotatable: true,
            scalable: true,
            cropBoxResizable: true
        });
        
        document.getElementById('save-profile-btn').disabled = false;
    };
    reader.readAsDataURL(file);
}

async function saveProfilePicture() {
    if (!cropper || !currentUser) {
        alert("Please select an image first");
        return;
    }
    
    try {
        const canvas = cropper.getCroppedCanvas({
            width: 300,
            height: 300,
            fillColor: '#fff'
        });
        
        canvas.toBlob(async (blob) => {
            const reader = new FileReader();
            reader.onloadend = function() {
                const base64data = reader.result;
                
                const storageKey = `profile_picture_${currentUser.uid}`;
                localStorage.setItem(storageKey, base64data);
                
                document.getElementById('account-profile-pic').src = base64data;
                
                if (userData) {
                    userData.profilePictureUrl = base64data;
                }
                
                db.collection('users').doc(currentUser.uid).update({
                    profilePictureUrl: base64data
                }).then(() => {
                    alert("Profile picture updated successfully!");
                    closeModal('profile-picture-modal');
                }).catch(error => {
                    console.error("Error updating Firestore:", error);
                    alert("Profile picture saved locally. Cloud sync failed.");
                    closeModal('profile-picture-modal');
                });
            };
            reader.readAsDataURL(blob);
            
        }, 'image/jpeg', 0.8);
        
    } catch (error) {
        console.error("Error saving profile picture:", error);
        alert("Error saving profile picture. Please try again.");
        document.getElementById('save-profile-btn').innerHTML = 'Save Picture';
        document.getElementById('save-profile-btn').disabled = false;
    }
}

function togglePasswordVisibility(inputId, toggleButton) {
    const input = document.getElementById(inputId);
    const icon = toggleButton.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function shareReferralLink() {
    if (!userData || !userData.referralCode) {
        alert("Please wait while we load your referral information.");
        return;
    }
    
    const referralLink = generateReferralLink(userData.referralCode);
    
    const shareText = `*Hello, I kindly invite you to Malcom Finance.*
*Create an account with this link: ${referralLink}*

Or manually input referral code: "${userData.referralCode}"`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Join Malcom Finance',
                text: shareText,
                url: referralLink
            });
        } catch (error) {
            copyToClipboard(shareText);
        }
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Referral message copied to clipboard!\n\n" + text);
    }).catch(err => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert("Referral message copied to clipboard!\n\n" + text);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); });
    
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, false);
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            updateUI();
            loadProfilePicture();
            loadTodaysActivities();
            loadWeeklyActivitiesGrid();
            loadTransactions();
            loadOffers();
        } else {
            setTimeout(() => {
                showLoginModal();
                autoFillReferralFromURL();
            }, 100);
        }
    });
    
    document.getElementById('register-name').addEventListener('input', function() {
        const validation = validateUsername(this.value);
        const errorDiv = document.getElementById('name-error');
        if (!validation.valid) {
            errorDiv.textContent = validation.message;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.style.display = 'none';
        }
    });
    
    document.getElementById('register-email').addEventListener('input', function() {
        const validation = validateEmail(this.value);
        const errorDiv = document.getElementById('email-error');
        if (!validation.valid) {
            errorDiv.textContent = validation.message;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.style.display = 'none';
        }
    });
    
    autoFillReferralFromURL();
});

async function loadUserData(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            userData = doc.data();
            userData.id = userId;
            
            await db.collection('users').doc(userId).update({
                lastLogin: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

async function loadTransactions() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('transactions')
            .where('userId', '==', currentUser.uid)
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        
        allTransactions = [];
        snapshot.forEach(doc => {
            allTransactions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Loaded ${allTransactions.length} transactions for user ${currentUser.uid}`);
        
        updateTransactionsUI();
        updateBalances();
        
    } catch (error) {
        console.error("Error loading transactions:", error);
        try {
            const snapshot = await db.collection('transactions')
                .where('userId', '==', currentUser.uid)
                .get();
            
            allTransactions = [];
            snapshot.forEach(doc => {
                allTransactions.push({ id: doc.id, ...doc.data() });
            });
            
            allTransactions.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA;
            });
            
            console.log(`Loaded ${allTransactions.length} transactions (fallback method)`);
            updateTransactionsUI();
            updateBalances();
        } catch (fallbackError) {
            console.error("Fallback error loading transactions:", fallbackError);
        }
    }
}

function updateTransactionsUI() {
    const container = document.getElementById('transactions-container');
    const noTransactionsDiv = document.getElementById('no-transactions');
    
    if (!container) return;
    
    const existingItems = container.querySelectorAll('.transaction-item');
    existingItems.forEach(item => item.remove());
    
    if (allTransactions.length === 0) {
        if (noTransactionsDiv) {
            noTransactionsDiv.style.display = 'block';
        }
        return;
    }
    
    if (noTransactionsDiv) {
        noTransactionsDiv.style.display = 'none';
    }
    
    allTransactions.forEach(txn => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        
        const date = txn.date ? new Date(txn.date).toLocaleString() : 'N/A';
        const amount = parseFloat(txn.amount) || 0;
        const isPositive = ['deposit', 'earning', 'investment_return', 'referral_bonus', 'bonus'].includes(txn.type);
        const isNegative = ['withdrawal', 'investment', 'fee'].includes(txn.type);
        
        let amountClass = '';
        let amountSign = '';
        
        if (isPositive) {
            amountClass = 'amount-positive';
            amountSign = '+';
        } else if (isNegative) {
            amountClass = 'amount-negative';
            amountSign = '-';
        }
        
        let icon = 'fa-exchange-alt';
        let iconColor = '#6ab8ff';
        
        switch(txn.type) {
            case 'deposit':
                icon = 'fa-arrow-down';
                iconColor = '#28a745';
                break;
            case 'withdrawal':
                icon = 'fa-arrow-up';
                iconColor = '#dc3545';
                break;
            case 'earning':
                icon = 'fa-money-bill-wave';
                iconColor = '#ffc107';
                break;
            case 'investment':
                icon = 'fa-chart-line';
                iconColor = '#17a2b8';
                break;
            case 'referral_bonus':
                icon = 'fa-user-friends';
                iconColor = '#6f42c1';
                break;
            case 'bonus':
                icon = 'fa-gift';
                iconColor = '#fd7e14';
                break;
            case 'fee':
                icon = 'fa-percentage';
                iconColor = '#dc3545';
                break;
        }
        
        transactionEl.innerHTML = `
            <div class="transaction-header">
                <div>
                    <i class="fas ${icon}" style="color: ${iconColor}; margin-right: 8px;"></i>
                    <span class="transaction-type">${txn.type.replace('_', ' ')}</span>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${amountSign}$${Math.abs(amount).toFixed(2)}
                </div>
            </div>
            
            ${txn.description ? `<div class="transaction-description">${txn.description}</div>` : ''}
            
            <div class="transaction-details">
                <div><strong>Status:</strong> 
                    <span class="status-badge status-${txn.status || 'pending'}">
                        ${txn.status || 'pending'}
                    </span>
                </div>
                ${txn.method ? `<div><strong>Method:</strong> ${txn.method}</div>` : ''}
                ${txn.plan ? `<div><strong>Plan:</strong> ${txn.plan}</div>` : ''}
                ${txn.netAmount ? `<div><strong>Net Amount:</strong> $${txn.netAmount.toFixed(2)}</div>` : ''}
                ${txn.fee ? `<div><strong>Fee:</strong> $${txn.fee.toFixed(2)}</div>` : ''}
            </div>
            
            <div class="transaction-date">
                <i class="far fa-clock"></i> ${date}
            </div>
        `;
        
        container.appendChild(transactionEl);
    });
}

function loadWeeklyActivitiesGrid() {
    const activitiesGrid = document.getElementById('activities-grid');
    const inactiveMessage = document.getElementById('inactive-activities-message');
    
    if (!userData) {
        activitiesGrid.innerHTML = '<p style="color: white;">Please login to view activities</p>';
        return;
    }
    
    if (!userData.isActive) {
        inactiveMessage.style.display = 'block';
        activitiesGrid.style.display = 'none';
        return;
    }
    
    inactiveMessage.style.display = 'none';
    activitiesGrid.style.display = 'block';
    
    const days = [
        { name: 'Sunday', icon: 'fa-sun', color: '#FFD700', page: 'sunday.html' },
        { name: 'Monday', icon: 'fa-moon', color: '#6A5ACD', page: 'monday.html' },
        { name: 'Tuesday', icon: 'fa-star', color: '#32CD32', page: 'tuesday.html' },
        { name: 'Wednesday', icon: 'fa-cloud', color: '#87CEEB', page: 'wednesday.html' },
        { name: 'Thursday', icon: 'fa-bolt', color: '#FFA500', page: 'thursday.html' },
        { name: 'Friday', icon: 'fa-heart', color: '#FF69B4', page: 'friday.html' },
        { name: 'Saturday', icon: 'fa-gem', color: '#9370DB', page: 'saturday.html' }
    ];
    
    const today = new Date().getDay();
    
    let html = '<div class="days-grid">';
    
    days.forEach((day, index) => {
        const isToday = index === today;
        const isPastDay = index < today;
        
        html += `
            <a href="${day.page}" class="day-card ${isToday ? 'today' : ''} ${isPastDay ? 'past' : ''}">
                <div class="day-icon" style="color: ${day.color};">
                    <i class="fas ${day.icon}"></i>
                </div>
                <div class="day-name">${day.name}</div>
                ${isToday ? '<sup class="today-badge fas fa-circle fa-fade"></sup>' : ''}
            </a>
        `;
    });
    
    html += '</div>';
    activitiesGrid.innerHTML = html;
    
    document.querySelectorAll('.day-card.past').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            alert('This day has passed. Please complete today\'s activities.');
        });
    });
}

function updateBalances() {
    if (!userData) return;
    
    let mainBalance = parseFloat(userData.balance) || 0;
    let earningsBalance = 0;
    let referralBalance = 0;
    let bonusesBalance = 0;
    let totalWithdrawn = 0;
    
    allTransactions.forEach(txn => {
        const amount = parseFloat(txn.amount) || 0;
        const status = txn.status || 'pending';
        
        if (status !== 'completed') return;
        
        switch(txn.type) {
            case 'earning':
                earningsBalance += amount;
                break;
            case 'referral_bonus':
                referralBalance += amount;
                break;
            case 'bonus':
                bonusesBalance += amount;
                break;
            case 'withdrawal':
                totalWithdrawn += amount;
                break;
        }
    });
    
    const totalEarnings = earningsBalance + referralBalance + bonusesBalance;
    
    document.getElementById('main-balance').textContent = `$${mainBalance.toFixed(2)}`;
    document.getElementById('earnings-balance').textContent = `$${earningsBalance.toFixed(2)}`;
    document.getElementById('referral-balance').textContent = `$${referralBalance.toFixed(2)}`;
    document.getElementById('bonuses-balance').textContent = `$${bonusesBalance.toFixed(2)}`;
    document.getElementById('withdrawn-balance').textContent = `$${totalWithdrawn.toFixed(2)}`;
    document.getElementById('total-earnings-balance').textContent = `$${totalEarnings.toFixed(2)}`;
    
    document.getElementById('accbal').textContent = mainBalance.toFixed(2);
}

async function loadOffers() {
    try {
        const offers = [
            {
                title: "Referral Bonus",
                description: "Make 20 referrals in 2 days and get $2.1 bonus!",
                reward: 2.1
            },
            {
                title: "First Investment",
                description: "Make your first investment and get 5% extra returns!",
                reward: "5% extra"
            }
        ];
        
        const container = document.getElementById('offers-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        offers.forEach(offer => {
            const offerEl = document.createElement('div');
            offerEl.className = 'offer-card';
            offerEl.innerHTML = `
                <h4>${offer.title}</h4>
                <p>${offer.description}</p>
                <p style="color: #6ab8ff; margin-top: 10px;">Reward: ${offer.reward}</p>
            `;
            container.appendChild(offerEl);
        });
    } catch (error) {
        console.error("Error loading offers:", error);
    }
}

function updateUI() {
    if (!userData) return;
    
    document.getElementById('username').textContent = userData.name || 'User';
    document.getElementById('user-email').textContent = userData.email || '';
    document.getElementById('accbal').textContent = (userData.balance || 0).toFixed(2);
    
    document.getElementById('account-status').textContent = userData.isActive ? 'Active' : 'Inactive';
    document.getElementById('account-name').textContent = userData.name || 'N/A';
    document.getElementById('account-email').textContent = userData.email || 'N/A';
    document.getElementById('account-phone').textContent = userData.phone || 'N/A';
    document.getElementById('user-referral').textContent = userData.referralCode || 'N/A';
    document.getElementById('total-referrals').textContent = userData.referrals || 0;
    document.getElementById('join-date').textContent = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A';
    
    document.getElementById('account-page-name').textContent = userData.name || 'N/A';
    document.getElementById('account-page-email').textContent = userData.email || 'N/A';
    document.getElementById('account-page-phone').textContent = userData.phone || 'N/A';
    document.getElementById('account-page-status').textContent = userData.isActive ? 'Active' : 'Inactive';
    document.getElementById('account-page-referral').textContent = userData.referralCode || 'N/A';
    document.getElementById('account-page-total-referrals').textContent = userData.referrals || 0;
    document.getElementById('account-page-join-date').textContent = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A';
    
    if (userData.referralCode) {
        const referralLink = document.getElementById('referral-link');
        if (referralLink) {
            const referralUrl = generateReferralLink(userData.referralCode);
            referralLink.innerHTML = `
                <strong>Link:</strong> ${referralUrl}<br>
                <strong>Code:</strong> ${userData.referralCode}
            `;
        }
    }
    
    updateBalances();
    loadWeeklyActivitiesGrid();
    
    const todayActivitiesBtn = document.getElementById('today-activities-btn');
    if (todayActivitiesBtn) {
        if (userData.isActive) {
            todayActivitiesBtn.disabled = false;
            todayActivitiesBtn.innerHTML = '<i class="fas fa-calendar-day"></i> Today\'s Activities';
        } else {
            todayActivitiesBtn.disabled = true;
            todayActivitiesBtn.innerHTML = '<i class="fas fa-lock"></i> Account Not Activated';
        }
    }
    
    if (!userData.isActive) {
        showNotification("Please activate your account by making a deposit to access daily activities.");
    }
}

function showNotification(message) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
    
    if (pageId === 'transactions' && currentUser) {
        loadTransactions();
    }
    
    if (pageId === 'activity' && currentUser) {
        loadWeeklyActivitiesGrid();
    }
    
    if (pageId === 'offers' && currentUser) {
        loadOffers();
    }
    
    if (pageId === 'balances' && currentUser) {
        updateBalances();
    }
    
    if (pageId === 'account' && currentUser) {
        updateUI();
    }
    
    if (pageId === 'home' && currentUser) {
        loadTodaysActivities();
    }
    
    closeNav();
}

function openNav() {
    document.getElementById('nav-menu').classList.add('open');
}

function closeNav() {
    document.getElementById('nav-menu').classList.remove('open');
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showLoginModal() {
    showModal('login-modal');
    showRegisterForm();
}

function showDepositModal() {
    showModal('deposit-modal');
}

function showWithdrawModal() {
    if (!userData || !userData.isActive) {
        alert("Please activate your account first by making a deposit.");
        return;
    }
    
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-wallet').value = '';
    document.getElementById('withdraw-password').value = '';
    document.getElementById('withdraw-amount').placeholder = "Minimum: $6";
    
    showModal('withdraw-modal');
}

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    if (!email || !password) {
        errorDiv.textContent = 'Please enter email and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        closeModal('login-modal');
        location.reload();
    } catch (error) {
        errorDiv.textContent = 'Invalid email or password. Please try again.';
        errorDiv.style.display = 'block';
    }
}

async function register() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;
    const referral = document.getElementById('register-referral').value.trim();
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const nameValidation = validateUsername(name);
    if (!nameValidation.valid) {
        document.getElementById('name-error').textContent = nameValidation.message;
        document.getElementById('name-error').style.display = 'block';
        return;
    }
    
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
        document.getElementById('email-error').textContent = emailValidation.message;
        document.getElementById('email-error').style.display = 'block';
        return;
    }
    
    if (!password || password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (!phone) {
        errorDiv.textContent = 'Please enter your phone number';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        const emailCheck = await db.collection('users')
            .where('email', '==', email)
            .get();
        
        if (!emailCheck.empty) {
            errorDiv.textContent = 'This email is already registered. Please use a different email or login.';
            errorDiv.style.display = 'block';
            return;
        }
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        const referralCode = generateReferralCode(name);
        
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            referralCode: referralCode,
            referredBy: referral || null,
            balance: 0,
            isActive: false,
            referrals: 0,
            earningsBalance: 0,
            referralBalance: 0,
            bonusesBalance: 0,
            totalWithdrawn: 0,
            totalEarnings: 0,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            profilePictureUrl: ''
        });
        
        if (referral) {
            await updateReferrer(referral);
        }
        
        successDiv.textContent = 'Account created successfully! Redirecting...';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        setTimeout(() => {
            closeModal('login-modal');
            location.reload();
        }, 2000);
        
    } catch (error) {
        console.error("Registration error:", error);
        errorDiv.textContent = error.message || 'Registration failed. Please try again.';
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    }
}

function generateReferralCode(name) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = name.substring(0, 3).toUpperCase();
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

async function updateReferrer(referralCode) {
    try {
        const snapshot = await db.collection('users')
            .where('referralCode', '==', referralCode)
            .get();
        
        if (!snapshot.empty) {
            const referrerDoc = snapshot.docs[0];
            await db.collection('users').doc(referrerDoc.id).update({
                referrals: firebase.firestore.FieldValue.increment(1)
            });
        }
    } catch (error) {
        console.error("Error updating referrer:", error);
    }
}

async function confirmWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    const wallet = document.getElementById('withdraw-wallet').value;
    const password = document.getElementById('withdraw-password').value;
    
    if (!amount || amount < 6) {
        alert("Minimum withdrawal amount is $6");
        return;
    }
    
    if (!wallet) {
        alert("Please enter your wallet address or email");
        return;
    }
    
    if (!password) {
        alert("Please enter your password to confirm");
        return;
    }
    
    if (!userData.balance || amount > userData.balance) {
        alert("Insufficient balance");
        return;
    }
    
    try {
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            password
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        const fee = amount * 0.05;
        const netAmount = amount - fee;
        
        pendingWithdrawalData = {
            amount: amount,
            method: method,
            wallet: wallet,
            fee: fee,
            netAmount: netAmount
        };
        
        document.getElementById('withdraw-confirm-details').innerHTML = `
            <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
            <p><strong>Fee (5%):</strong> $${fee.toFixed(2)}</p>
            <p><strong>Net Amount:</strong> $${netAmount.toFixed(2)}</p>
            <p><strong>Method:</strong> ${method}</p>
            <p><strong>To:</strong> ${wallet}</p>
            <p style="color: #ffc107; margin-top: 15px;">Are you sure you want to proceed?</p>
        `;
        
        closeModal('withdraw-modal');
        showModal('withdraw-confirm-modal');
        
    } catch (error) {
        console.error("Password verification failed:", error);
        alert("Incorrect password. Please try again.");
    }
}

async function submitWithdrawal() {
    if (!pendingWithdrawalData) return;
    
    try {
        const { amount, method, wallet, fee, netAmount } = pendingWithdrawalData;
        
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'withdrawal',
            amount: amount,
            netAmount: netAmount,
            fee: fee,
            method: method,
            wallet: wallet,
            status: 'pending',
            date: new Date().toISOString(),
            description: `Withdrawal request via ${method}`
        });
        
        alert("Withdrawal request submitted successfully! It will be processed within 24-48 hours.");
        closeModal('withdraw-confirm-modal');
        
        pendingWithdrawalData = null;
        loadTransactions();
        
    } catch (error) {
        console.error("Error submitting withdrawal:", error);
        alert("Error submitting withdrawal. Please try again.");
    }
}

function showReferralModal() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showModal('referral-modal');
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        auth.signOut().then(() => {
            location.reload();
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const backgrounds = [
        'bgs/bg1.png',
        'bgs/bg2.png',
        'bgs/bg3.png',
        'bgs/bg4.png',
        'bgs/bg5.png'
    ];
    
    const randomBg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
    
    document.body.style.backgroundImage = `url(${randomBg})`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
});