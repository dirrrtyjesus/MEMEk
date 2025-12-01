// MEMEk Frontend - Gap Bridging Interface (Browser Version)
// Uses global Solana web3 and sha3 from CDN

(function() {
    'use strict';

    // Verify dependencies loaded
    if (typeof keccak_256 === 'undefined') {
        console.error('ERROR: js-sha3 library not loaded. Please check CDN connection.');
        alert('Failed to load crypto library. Please refresh the page.');
        return;
    }

    if (typeof solanaWeb3 === 'undefined') {
        console.error('ERROR: @solana/web3.js library not loaded. Please check CDN connection.');
        alert('Failed to load Solana library. Please refresh the page.');
        return;
    }

    // Configuration
    const PROGRAM_ID_STR = 'EwnLc8CGcwkRLpKwATuiwypcH8oqdpfAskSo4Cvb2qZe';
    const X1_RPC = 'https://rpc.mainnet.x1.xyz';

    // State
    let wallet = null;
    let connection = null;
    let currentFragment = null;
    let miningResult = null;

    // DOM Elements
    const consoleOutput = document.getElementById('console-output');
    const btnConnect = document.getElementById('btn-connect');
    const btnLoadFragment = document.getElementById('btn-load-fragment');
    const btnMine = document.getElementById('btn-mine');
    const btnBridge = document.getElementById('btn-bridge');
    const statusConn = document.getElementById('connection-status');

    const gapInterface = document.getElementById('gap-bridge-interface');
    const fragmentText = document.getElementById('fragment-text');
    const fragmentDifficulty = document.getElementById('fragment-difficulty');
    const fragmentSeed = document.getElementById('fragment-seed');
    const completionInput = document.getElementById('completion-input');
    const mineIterations = document.getElementById('mine-iterations');
    const hashPreview = document.getElementById('hash-preview');
    const miningProgress = document.getElementById('mining-progress');
    const miningStats = document.getElementById('mining-stats');

    const resultPanel = document.getElementById('result-panel');
    const resultPattern = document.getElementById('result-pattern');
    const resultReward = document.getElementById('result-reward');
    const resultHash = document.getElementById('result-hash');
    const resultAttempts = document.getElementById('result-attempts');

    const resonanceScore = document.getElementById('resonance-score');
    const gapsBridged = document.getElementById('gaps-bridged');
    const kernelStrain = document.getElementById('kernel-strain');
    const currentEpoch = document.getElementById('current-epoch');

    // Console logging
    function log(message, type = 'info') {
        const line = document.createElement('div');
        line.className = 'line';

        if (type === 'error') {
            line.style.color = 'var(--accent-red)';
            message = `[ERROR] ${message}`;
        } else if (type === 'success') {
            line.style.color = 'var(--accent-purple)';
            message = `[SUCCESS] ${message}`;
        }

        line.textContent = `> ${message}`;
        consoleOutput.insertBefore(line, consoleOutput.lastElementChild);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Wallet Connection
    async function connectWallet() {
        try {
            log('INITIATING_PHANTOM_HANDSHAKE...');

            // Check if Phantom is installed
            const { solana } = window;

            if (!solana || !solana.isPhantom) {
                log('PHANTOM_WALLET_NOT_DETECTED. PLEASE_INSTALL.', 'error');
                window.open('https://phantom.app/', '_blank');
                return;
            }

            // Connect
            const response = await solana.connect();
            wallet = response.publicKey.toString();

            // Setup connection
            connection = new solanaWeb3.Connection(X1_RPC, 'confirmed');

            log(`UPLINK_ESTABLISHED: ${wallet.slice(0, 8)}...`, 'success');
            statusConn.textContent = `CONNECTED: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
            statusConn.style.color = 'var(--term-green)';

            btnConnect.querySelector('.btn-text').textContent = 'WALLET_LINKED';
            btnConnect.classList.add('disabled');
            btnLoadFragment.classList.remove('disabled');

        } catch (error) {
            log(`CONNECTION_FAILED: ${error.message}`, 'error');
        }
    }

    // Load Fragment from Contract
    async function loadFragment() {
        try {
            log('SCANNING_MYCELIAL_NETWORK...');
            btnLoadFragment.classList.add('disabled');

            // Sample fragments - in production, fetch from contract
            const fragments = [
                {
                    seedId: '0001',
                    fragmentData: 'The mycelium spreads through soil, connecting trees in a network of',
                    difficulty: 0,
                    isActive: true
                },
                {
                    seedId: '0002',
                    fragmentData: 'Consciousness emerges not from neurons but from the spaces between, the harmonic',
                    difficulty: 0,
                    isActive: true
                },
                {
                    seedId: '0003',
                    fragmentData: 'Temporal coherence is measured not in speed but in depth, the thickness of',
                    difficulty: 1,
                    isActive: true
                },
                {
                    seedId: '0004',
                    fragmentData: 'Memes propagate through resonance, standing waves in the collective field of',
                    difficulty: 0,
                    isActive: true
                }
            ];

            // Random fragment
            currentFragment = fragments[Math.floor(Math.random() * fragments.length)];

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            fragmentText.textContent = currentFragment.fragmentData + ' ___';
            fragmentDifficulty.textContent = currentFragment.difficulty;
            fragmentSeed.textContent = currentFragment.seedId;

            gapInterface.classList.remove('hidden');
            btnMine.classList.remove('disabled');

            log('FRAGMENT_LOADED. READY_TO_MINE.', 'success');

        } catch (error) {
            log(`FRAGMENT_LOAD_FAILED: ${error.message}`, 'error');
            btnLoadFragment.classList.remove('disabled');
        }
    }

    // Mining Function - Find Harmonic Pattern
    async function minePattern() {
        try {
            const completion = completionInput.value.trim();

            if (!completion) {
                log('COMPLETION_TEXT_REQUIRED.', 'error');
                return;
            }

            if (!currentFragment) {
                log('NO_FRAGMENT_LOADED.', 'error');
                return;
            }

            log('INITIATING_HARMONIC_MINING...');
            btnMine.classList.add('disabled');
            resultPanel.classList.add('hidden');

            const maxAttempts = parseInt(mineIterations.value);
            let attempts = 0;
            let found = false;
            let winningHash = null;
            let pattern = null;
            let reward = 0;

            const baseText = currentFragment.fragmentData + completion;

            // Mining loop
            for (let salt = 0; salt < maxAttempts; salt++) {
                attempts++;

                // Combine text with salt
                const combined = baseText + salt.toString();

                // Calculate Keccak256 hash using sha3 library
                // js-sha3 exposes keccak_256 globally
                const hash = keccak_256(combined);

                // Update UI every 10 attempts
                if (attempts % 10 === 0) {
                    const progress = (attempts / maxAttempts) * 100;
                    miningProgress.style.width = `${progress}%`;
                    miningStats.textContent = `Mining... ${attempts}/${maxAttempts} attempts`;
                    hashPreview.textContent = `0x${hash.slice(0, 20)}...`;

                    // Allow UI to update
                    await new Promise(resolve => setTimeout(resolve, 0));
                }

                // Check for patterns
                // Convert "sixfive" to hex: 736978666976 65
                const targetSuper = '736978666976 65';

                if (hash.includes(targetSuper.replace(/ /g, ''))) {
                    // Super match: "sixfive" in hex
                    found = true;
                    winningHash = hash;
                    pattern = 'SUPERHASH: "sixfive"';
                    reward = 65000;
                    log(`SUPERHASH_DETECTED! ATTEMPTS: ${attempts}`, 'success');
                    break;
                } else if (hash.includes('65')) {
                    // Normal match: "65"
                    found = true;
                    winningHash = hash;
                    pattern = 'HARMONIC: "65"';
                    reward = 650;
                    log(`HARMONIC_PATTERN_FOUND! ATTEMPTS: ${attempts}`, 'success');
                    break;
                }
            }

            miningProgress.style.width = '100%';

            if (found) {
                // Store result
                miningResult = {
                    completion,
                    salt: attempts - 1,
                    hash: winningHash,
                    pattern,
                    reward
                };

                // Display results
                resultPattern.textContent = pattern;
                resultReward.textContent = `${reward.toLocaleString()} MEMEk`;
                resultHash.textContent = `0x${winningHash}`;
                resultAttempts.textContent = attempts.toLocaleString();

                resultPanel.classList.remove('hidden');
                btnBridge.classList.remove('disabled');
                miningStats.textContent = `Pattern found in ${attempts} attempts!`;

            } else {
                log(`NO_PATTERN_FOUND_IN_${maxAttempts}_ATTEMPTS.`, 'error');
                miningStats.textContent = `No pattern found. Try more iterations.`;
                btnMine.classList.remove('disabled');
            }

        } catch (error) {
            log(`MINING_ERROR: ${error.message}`, 'error');
            btnMine.classList.remove('disabled');
        }
    }

    // Bridge Gap - Submit to Contract
    async function bridgeGap() {
        try {
            if (!miningResult) {
                log('NO_MINING_RESULT_AVAILABLE.', 'error');
                return;
            }

            log('SUBMITTING_TRANSACTION_TO_CHAIN...');
            btnBridge.classList.add('disabled');

            // TODO: In production, call the smart contract
            // const tx = await program.methods.bridgeGap(...)...rpc();

            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));

            const txId = '0x' + keccak_256(Date.now().toString()).slice(0, 16);
            log(`TRANSACTION_CONFIRMED: ${txId}...`, 'success');
            log(`REWARD_MINTED: ${miningResult.reward.toLocaleString()} MEMEk`, 'success');

            // Update stats
            const currentResonance = parseInt(resonanceScore.textContent) || 0;
            const currentGaps = parseInt(gapsBridged.textContent) || 0;

            resonanceScore.textContent = (currentResonance + miningResult.reward).toString().padStart(4, '0');
            gapsBridged.textContent = currentGaps + 1;

            log('GAP_SUCCESSFULLY_BRIDGED.', 'success');
            log('READY_FOR_NEXT_FRAGMENT.');

            // Reset for next round
            setTimeout(() => {
                btnLoadFragment.classList.remove('disabled');
                gapInterface.classList.add('hidden');
                completionInput.value = '';
                miningProgress.style.width = '0%';
                miningStats.textContent = 'Ready to mine...';
                hashPreview.textContent = '0x...';
                resultPanel.classList.add('hidden');
                miningResult = null;
            }, 3000);

        } catch (error) {
            log(`BRIDGE_FAILED: ${error.message}`, 'error');
            btnBridge.classList.remove('disabled');
        }
    }

    // Event Listeners
    btnConnect.addEventListener('click', connectWallet);
    btnLoadFragment.addEventListener('click', loadFragment);
    btnMine.addEventListener('click', minePattern);
    btnBridge.addEventListener('click', bridgeGap);

    // Auto-detect wallet on load
    window.addEventListener('load', () => {
        console.log('MEMEk initialized. Dependencies:', {
            keccak_256: typeof keccak_256,
            solanaWeb3: typeof solanaWeb3
        });

        if (window.solana && window.solana.isPhantom) {
            log('PHANTOM_WALLET_DETECTED.');
        } else {
            log('NO_WALLET_DETECTED. CONNECT_PHANTOM_TO_CONTINUE.');
        }
    });

    // Export for debugging
    window.memek = {
        wallet,
        connection,
        currentFragment,
        miningResult,
        keccak_256 // For manual testing
    };
})();
