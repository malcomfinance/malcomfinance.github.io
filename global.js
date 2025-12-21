// ==============================================
// Firebase Configuration
// ==============================================
const firebaseConfig = {
    apiKey: "AIzaSyAJaFVETxpy8Vr5e6RXDWi3NBhEUaZEPN4",
    authDomain: "malcolm-finance.firebaseapp.com",
    projectId: "malcolm-finance",
    storageBucket: "malcolm-finance.firebasestorage.app",
    messagingSenderId: "987613399580",
    appId: "1:987613399580:web:0237b2c8c2c7df54222dd9",
    measurementId: "G-1CEG3BWFBP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
window.auth = auth;
window.db = db;

// ==============================================
// Global Variables
// ==============================================
let currentUser = null;
let userData = null;
let weeklyActivities = [];
let allTransactions = [];
let currentPlan = null;
let pendingWithdrawalData = null;

// ==============================================
// Navigation Menu Script
// ==============================================
const navMenu = document.getElementById('nav-menu');
const closeMenu = document.getElementById('close-menu');

// Touch events for opening menu
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
    
    // Only trigger if swipe is mostly horizontal and from the right edge
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
if (canvas) {
    const ctx = canvas.getContext('2d');
    
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

// ==============================================
// Utility Functions
// ==============================================
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

// ==============================================
// Navigation Functions
// ==============================================
function openNav() {
    document.getElementById('nav-menu').classList.add('open');
}

function closeNav() {
    document.getElementById('nav-menu').classList.remove('open');
}

// ==============================================
// Page Navigation
// ==============================================
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
    
    // Load transactions when transactions page is shown
    if (pageId === 'transactions' && currentUser) {
        loadTransactions();
    }
    
    // Reload activities grid when home page is shown
    if (pageId === 'home' && currentUser) {
        loadWeeklyActivitiesGrid();
    }
    
    // Close nav menu
    closeNav();
}

// ==============================================
// Modal Functions
// ==============================================
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function showLoginModal() {
    showModal('login-modal');
}

function showDepositModal() {
    showModal('deposit-modal');
}

function showWithdrawModal() {
    if (!userData || !userData.isActive) {
        alert("Please activate your account first by making a deposit.");
        return;
    }
    
    // Clear previous inputs
    document.getElementById('withdraw-amount').value = '';
    document.getElementById('withdraw-wallet').value = '';
    document.getElementById('withdraw-password').value = '';
    
    showModal('withdraw-modal');
}

function showTab(tabId) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`).classList.add('active');
}

function showReferralModal() {
    if (!currentUser) {
        showLoginModal();
        return;
    }
    showModal('referral-modal');
}

// ==============================================
// Data Loading Functions
// ==============================================
async function loadUserData(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
            userData = doc.data();
            userData.id = userId;
            
            // Update last login
            await db.collection('users').doc(userId).update({
                lastLogin: new Date().toISOString()
            });
        } else {
            console.log("No user data found");
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

function loadWeeklyActivitiesGrid() {
    const activitiesGrid = document.getElementById('activities-grid');
    const inactiveMessage = document.getElementById('inactive-activities-message');
    
    if (!userData) {
        activitiesGrid.innerHTML = '<p>Please login to view activities</p>';
        return;
    }
    
    if (!userData.isActive) {
        // Show inactive message and hide grid
        inactiveMessage.style.display = 'block';
        activitiesGrid.style.display = 'none';
        return;
    }
    
    // Show grid and hide inactive message
    inactiveMessage.style.display = 'none';
    activitiesGrid.style.display = 'grid';
    
    // Days data
    const days = [
        { name: 'Sunday', icon: 'fa-sun', color: '#FFD700', page: 'sunday.html' },
        { name: 'Monday', icon: 'fa-moon', color: '#6A5ACD', page: 'monday.html' },
        { name: 'Tuesday', icon: 'fa-star', color: '#32CD32', page: 'tuesday.html' },
        { name: 'Wednesday', icon: 'fa-cloud', color: '#87CEEB', page: 'wednesday.html' },
        { name: 'Thursday', icon: 'fa-bolt', color: '#FFA500', page: 'thursday.html' },
        { name: 'Friday', icon: 'fa-heart', color: '#FF69B4', page: 'friday.html' },
        { name: 'Saturday', icon: 'fa-gem', color: '#9370DB', page: 'saturday.html' }
    ];
    
    // Get current day
    const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentDayName = days[today].name.toLowerCase();
    
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
                ${isPastDay ? '<div class="completed-badge"><i class="fas fa-check"></i></div>' : ''}
            </a>
        `;
    });
    
    html += '</div>';
    activitiesGrid.innerHTML = html;
    
    // Add click handler for past days
    document.querySelectorAll('.day-card.past').forEach(card => {
        card.addEventListener('click', function(e) {
            e.preventDefault();
            alert('This day has passed. Please complete today\'s activities.');
        });
    });
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
        
        // Update UI immediately
        updateTransactionsUI();
    } catch (error) {
        console.error("Error loading transactions:", error);
        // Fallback: Try without ordering if index doesn't exist
        try {
            const snapshot = await db.collection('transactions')
                .where('userId', '==', currentUser.uid)
                .get();
            
            allTransactions = [];
            snapshot.forEach(doc => {
                allTransactions.push({ id: doc.id, ...doc.data() });
            });
            
            // Sort manually by date
            allTransactions.sort((a, b) => {
                const dateA = a.date ? new Date(a.date) : new Date(0);
                const dateB = b.date ? new Date(b.date) : new Date(0);
                return dateB - dateA; // Descending order
            });
            
            console.log(`Loaded ${allTransactions.length} transactions (fallback method)`);
            updateTransactionsUI();
        } catch (fallbackError) {
            console.error("Fallback error loading transactions:", fallbackError);
        }
    }
}

function updateTransactionsUI() {
    const container = document.getElementById('transactions-container');
    const noTransactionsDiv = document.getElementById('no-transactions');
    
    if (!container) return;
    
    // Clear existing transaction items
    const existingItems = container.querySelectorAll('.transaction-item');
    existingItems.forEach(item => item.remove());
    
    if (allTransactions.length === 0) {
        if (noTransactionsDiv) {
            noTransactionsDiv.style.display = 'block';
        }
        return;
    }
    
    // Hide no transactions message
    if (noTransactionsDiv) {
        noTransactionsDiv.style.display = 'none';
    }
    
    // Add each transaction
    allTransactions.forEach(txn => {
        const transactionEl = document.createElement('div');
        transactionEl.className = 'transaction-item';
        
        const date = txn.date ? new Date(txn.date).toLocaleString() : 'N/A';
        const amount = parseFloat(txn.amount) || 0;
        const isPositive = ['deposit', 'earning', 'investment_return', 'referral_bonus'].includes(txn.type);
        const isNegative = ['withdrawal', 'investment', 'fee'].includes(txn.type);
        
        // Determine amount class and sign
        let amountClass = '';
        let amountSign = '';
        
        if (isPositive) {
            amountClass = 'amount-positive';
            amountSign = '+';
        } else if (isNegative) {
            amountClass = 'amount-negative';
            amountSign = '-';
        }
        
        // Determine icon based on transaction type
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
            case 'fee':
                icon = 'fa-percentage';
                iconColor = '#fd7e14';
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

async function loadOffers() {
    try {
        // Default offers
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

// ==============================================
// UI Update Functions
// ==============================================
function updateUI() {
    if (!userData) return;
    
    document.getElementById('username').textContent = userData.name || 'User';
    document.getElementById('user-email').textContent = userData.email || '';
    document.getElementById('accbal').textContent = (userData.balance || 0).toFixed(2);
    document.getElementById('account-status').textContent = userData.isActive ? 'Active' : 'Inactive';
    document.getElementById('user-referral').textContent = userData.referralCode || 'N/A';
    document.getElementById('total-referrals').textContent = userData.referrals || 0;
    document.getElementById('join-date').textContent = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A';
    
    // Calculate earnings
    let totalEarnings = 0;
    let weekEarnings = 0;
    let todayEarnings = 0;
    
    const today = new Date().toDateString();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    allTransactions.forEach(txn => {
        if (txn.type === 'earning') {
            totalEarnings += txn.amount;
            
            const txnDate = new Date(txn.date);
            if (txnDate >= weekAgo) {
                weekEarnings += txn.amount;
            }
            
            if (txnDate.toDateString() === today) {
                todayEarnings += txn.amount;
            }
        }
    });
    
    // Update referral link
    if (userData.referralCode) {
        const referralLink = document.getElementById('referral-link');
        if (referralLink) {
            referralLink.textContent = `${userData.referralCode}`;
        }
    }
    
    // Reload activities grid to update activation status
    loadWeeklyActivitiesGrid();
    
    // Check activation
    if (!userData.isActive) {
        showNotification("Please activate your account by making a deposit to access daily activities.");
    }
}

function showNotification(message) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-info-circle"></i> ${message}
    `;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// ==============================================
// Authentication Functions
// ==============================================
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
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        closeModal('login-modal');
        location.reload();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
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

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const referral = document.getElementById('register-referral').value;
    const errorDiv = document.getElementById('register-error');
    const successDiv = document.getElementById('register-success');
    
    if (!name || !email || !phone || !password) {
        errorDiv.textContent = 'Please fill all required fields';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        // Create user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Generate referral code
        const referralCode = generateReferralCode(name);
        
        // Create user document
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            phone: phone,
            referralCode: referralCode,
            referredBy: referral || null,
            balance: 0,
            isActive: false,
            referrals: 0,
            totalEarnings: 0,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        });
        
        // If referral was used, update referrer
        if (referral) {
            await updateReferrer(referral);
        }
        
        successDiv.textContent = 'Account created successfully! Logging in...';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        setTimeout(() => {
            closeModal('login-modal');
            location.reload();
        }, 2000);
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
    }
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        auth.signOut().then(() => {
            location.reload();
        });
    }
}

// ==============================================
// Withdrawal Functions
// ==============================================
async function confirmWithdrawal() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    const wallet = document.getElementById('withdraw-wallet').value;
    const password = document.getElementById('withdraw-password').value;
    
    if (!amount || amount < 10) {
        alert("Minimum withdrawal amount is $10");
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
    
    // Verify password
    try {
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            password
        );
        
        await currentUser.reauthenticateWithCredential(credential);
        
        // Calculate fee and net amount
        const fee = amount * 0.05; // 5% fee
        const netAmount = amount - fee;
        
        // Store withdrawal data for confirmation
        pendingWithdrawalData = {
            amount: amount,
            method: method,
            wallet: wallet,
            fee: fee,
            netAmount: netAmount
        };
        
        // Show confirmation modal
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
        
        // Create withdrawal request
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
        
        // Clear pending data
        pendingWithdrawalData = null;
        
        // Reload transactions
        loadTransactions();
        
    } catch (error) {
        console.error("Error submitting withdrawal:", error);
        alert("Error submitting withdrawal. Please try again.");
    }
}

// ==============================================
// Investment Functions
// ==============================================
function invest(plan) {
    currentPlan = plan;
    let minAmount = 1.5;
    let returns = "5%";
    let planName = "Starter Plan";
    
    switch(plan) {
        case 'premium':
            minAmount = 3;
            returns = "20%";
            planName = "Premium Plan";
            break;
        case 'vip':
            minAmount = 10;
            returns = "50%";
            planName = "VIP Plan";
            break;
    }
    
    document.getElementById('invest-plan-title').textContent = planName;
    document.getElementById('plan-name').textContent = planName;
    document.getElementById('plan-returns').textContent = returns;
    document.getElementById('plan-min').textContent = minAmount;
    document.getElementById('invest-amount').min = minAmount;
    document.getElementById('invest-amount').value = minAmount;
    
    showModal('invest-modal');
}

async function submitInvestment() {
    const amount = parseFloat(document.getElementById('invest-amount').value);
    const method = document.getElementById('invest-method').value;
    
    if (!amount || amount < 1.5) {
        alert("Minimum investment amount is $50");
        return;
    }
    
    if (!userData.isActive) {
        alert("Please activate your account first by making a deposit.");
        return;
    }
    
    try {
        // Create investment
        await db.collection('transactions').add({
            userId: currentUser.uid,
            type: 'investment',
            amount: amount,
            plan: currentPlan,
            method: method,
            status: 'pending',
            date: new Date().toISOString(),
            description: `${currentPlan} investment via ${method}`
        });
        
        alert("Investment request submitted! Admin will review and approve.");
        closeModal('invest-modal');
        loadTransactions();
        
    } catch (error) {
        console.error("Error submitting investment:", error);
        alert("Error submitting investment. Please try again.");
    }
}

// ==============================================
// Referral Functions
// ==============================================
function copyReferralLink() {
    const link = document.getElementById('referral-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
        alert("Referral code copied to clipboard!");
    });
}

// ==============================================
// Utility Functions
// ==============================================
async function checkTodayCompletion() {
    if (!currentUser) return false;
    
    try {
        const today = new Date();
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
        
        const snapshot = await db.collection('activity_submissions')
            .where('userId', '==', currentUser.uid)
            .where('day', '==', dayName)
            .where('status', '==', 'approved')
            .get();
        
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking completion:", error);
        return false;
    }
}

// ==============================================
// Initialize App
// ==============================================
document.addEventListener('DOMContentLoaded', function() {
    // Prevent zooming
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
    
    // Check auth state
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData(user.uid);
            updateUI();
            loadWeeklyActivitiesGrid();
            loadTransactions();
            loadOffers();
            document.getElementById('loading-screen').style.display = 'none';
        } else {
            // Show login modal after delay
            setTimeout(() => {
                document.querySelectorAll('.loading-scn').forEach(btn => {
                    btn.style.display = 'none';
                });
                showLoginModal();
            }, 10);
        }
    });
});