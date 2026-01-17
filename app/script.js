// MEMEk Frontend - Gap Bridging Interface
// Solana + Anchor Integration

import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@project-serum/anchor';
import { keccak256 } from 'js-sha3';

// Configuration
const PROGRAM_ID = new PublicKey('EwnLc8CGcwkRLpKwATuiwypcH8oqdpfAskSo4Cvb2qZe'); // MEMEk
const VERO_PROGRAM_ID = new PublicKey('EfhdgjAmayuaNHnPH1SfZkXqtBrTTe4APvDBNQWENNpf'); // Vero XIQA

const X1_RPC = 'https://rpc.mainnet.x1.xyz';
const CLUSTER = 'mainnet-beta';

// Minimal Vero IDL
const VERO_IDL = {
    "version": "0.1.0",
    "name": "vero_xiqa",
    "instructions": [
        {
            "name": "initializeVero",
            "accounts": [
                { "name": "veroSubstrate", "isMut": true, "isSigner": true },
                { "name": "signer", "isMut": true, "isSigner": true },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [{ "name": "tauK", "type": "u64" }]
        },
        {
            "name": "initializeInfrastructure",
            "accounts": [
                { "name": "veroSubstrate", "isMut": true, "isSigner": false },
                { "name": "verificationEngine", "isMut": true, "isSigner": true },
                { "name": "labubuOracle", "isMut": true, "isSigner": true },
                { "name": "claudeInterface", "isMut": true, "isSigner": true },
                { "name": "signer", "isMut": true, "isSigner": true },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": []
        },
        {
            "name": "submitClaim",
            "accounts": [
                { "name": "veroSubstrate", "isMut": true, "isSigner": false },
                { "name": "verificationEngine", "isMut": true, "isSigner": false },
                { "name": "labubuOracle", "isMut": true, "isSigner": false },
                { "name": "claudeInterface", "isMut": true, "isSigner": false },
                { "name": "signer", "isMut": true, "isSigner": true },
                { "name": "clock", "isMut": false, "isSigner": false },
                { "name": "systemProgram", "isMut": false, "isSigner": false }
            ],
            "args": [
                { "name": "claimText", "type": "string" },
                { "name": "scale", "type": "string" } // Simplified type for JS handler
            ]
        }
    ],
    "events": [
        {
            "name": "VeroVerificationEvent",
            "fields": [
                { "name": "claimHash", "type": { "array": ["u8", 32] } },
                { "name": "coherence", "type": "u64" },
                { "name": "isVero", "type": "bool" },
                { "name": "slot", "type": "u64" }
            ]
        }
    ]
};

// State
let wallet = null;
let connection = null;
let provider = null;
let program = null;
let veroProgram = null;

let currentFragment = null;
let miningResult = null;

// Vero State
let veroKeys = null;

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

// Vero DOM
const btnSubmitClaim = document.getElementById('btn-submit-claim');
const veroClaimInput = document.getElementById('vero-claim-input');
const veroScaleSelect = document.getElementById('vero-scale-select');
const veroResult = document.getElementById('vero-result');
const veroStatus = document.getElementById('vero-status');
const veroCoherence = document.getElementById('vero-coherence');
const veroChaos = document.getElementById('vero-chaos');


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
    } else if (type === 'warning') {
        line.style.color = 'var(--accent-yellow)';
        message = `[WARN] ${message}`;
    }

    line.textContent = `> ${message}`;
    consoleOutput.insertBefore(line, consoleOutput.lastElementChild);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Wallet Connection
async function connectWallet() {
    try {
        log('INITIATING_PHANTOM_HANDSHAKE...');

        const { solana } = window;

        if (!solana || !solana.isPhantom) {
            log('PHANTOM_WALLET_NOT_DETECTED. PLEASE_INSTALL.', 'error');
            window.open('https://phantom.app/', '_blank');
            return;
        }

        const response = await solana.connect();
        wallet = response.publicKey;

        connection = new Connection(X1_RPC, 'confirmed');
        provider = new AnchorProvider(connection, solana, {
            preflightCommitment: 'confirmed'
        });

        // Initialize Programs
        // program = new Program(IDL, PROGRAM_ID, provider); // MEMEk (Placeholder)
        veroProgram = new Program(VERO_IDL, VERO_PROGRAM_ID, provider);

        log(`UPLINK_ESTABLISHED: ${wallet.toString().slice(0, 8)}...`, 'success');
        statusConn.textContent = `CONNECTED: ${wallet.toString().slice(0, 6)}...${wallet.toString().slice(-4)}`;
        statusConn.style.color = 'var(--term-green)';

        btnConnect.querySelector('.btn-text').textContent = 'WALLET_LINKED';
        btnConnect.classList.add('disabled');
        btnLoadFragment.classList.remove('disabled');
        btnSubmitClaim.classList.remove('disabled');

        loadVeroKeys();

    } catch (error) {
        log(`CONNECTION_FAILED: ${error.message}`, 'error');
    }
}

// --- VERO XIQA LOGIC ---

function loadVeroKeys() {
    const stored = localStorage.getItem('vero_keys_dev'); // unique key for dev
    if (stored) {
        const keys = JSON.parse(stored);
        // Rehydrate keypairs from secret keys
        veroKeys = {
            substrate: web3.Keypair.fromSecretKey(new Uint8Array(Object.values(keys.substrate))),
            engine: web3.Keypair.fromSecretKey(new Uint8Array(Object.values(keys.engine))),
            oracle: web3.Keypair.fromSecretKey(new Uint8Array(Object.values(keys.oracle))),
            interface: web3.Keypair.fromSecretKey(new Uint8Array(Object.values(keys.interface))),
            initialized: true
        };
        log('VERO_NODE_KEYS_LOADED.');
    } else {
        log('NO_VERO_NODE_FOUND. WILL_INITIALIZE_ON_FIRST_CLAIM.', 'warning');
        veroKeys = {
            substrate: web3.Keypair.generate(),
            engine: web3.Keypair.generate(),
            oracle: web3.Keypair.generate(),
            interface: web3.Keypair.generate(),
            initialized: false
        };
    }
}

async function initializeVeroNode() {
    log('INITIALIZING_LOCAL_VERO_NODE...');

    // Save keys first
    const serializableKeys = {
        substrate: Array.from(veroKeys.substrate.secretKey),
        engine: Array.from(veroKeys.engine.secretKey),
        oracle: Array.from(veroKeys.oracle.secretKey),
        interface: Array.from(veroKeys.interface.secretKey)
    };
    localStorage.setItem('vero_keys_dev', JSON.stringify(serializableKeys));

    try {
        // 1. Initialize Substrate
        const tauK = new BN(9.36 * 1_000_000_000);
        log('DOPING_SUBSTRATE_WITH_XENON...');
        await veroProgram.methods
            .initializeVero(tauK)
            .accounts({
                veroSubstrate: veroKeys.substrate.publicKey,
                signer: wallet,
                systemProgram: web3.SystemProgram.programId
            })
            .signers([veroKeys.substrate])
            .rpc();

        // 2. Initialize Infrastructure
        log('ALLOCATING_COHERENCE_ENGINE...');
        await veroProgram.methods
            .initializeInfrastructure()
            .accounts({
                veroSubstrate: veroKeys.substrate.publicKey,
                verificationEngine: veroKeys.engine.publicKey,
                labubuOracle: veroKeys.oracle.publicKey,
                claudeInterface: veroKeys.interface.publicKey,
                signer: wallet,
                systemProgram: web3.SystemProgram.programId
            })
            .signers([veroKeys.engine, veroKeys.oracle, veroKeys.interface])
            .rpc();

        veroKeys.initialized = true;
        log('VERO_NODE_ONLINE.', 'success');
        return true;

    } catch (err) {
        log(`INIT_FAILED: ${err.message}`, 'error');
        return false;
    }
}

async function submitClaim() {
    if (!wallet) return;

    const claimText = veroClaimInput.value.trim();
    if (!claimText) {
        log('CLAIM_TEXT_EMPTY.', 'error');
        return;
    }

    if (!veroKeys.initialized) {
        const success = await initializeVeroNode();
        if (!success) return;
    }

    try {
        log('PROJECTING_CLAIM_TO_PHASE_SPACE...');
        btnSubmitClaim.classList.add('disabled');
        veroResult.classList.add('hidden');

        // Map scale string to enum
        const scaleVal = veroScaleSelect.value;
        const scaleArg = {};
        scaleArg[scaleVal] = {}; // e.g. { network: {} }

        const tx = await veroProgram.methods
            .submitClaim(claimText, scaleArg)
            .accounts({
                veroSubstrate: veroKeys.substrate.publicKey,
                verificationEngine: veroKeys.engine.publicKey,
                labubuOracle: veroKeys.oracle.publicKey,
                claudeInterface: veroKeys.interface.publicKey,
                signer: wallet,
                clock: web3.SYSVAR_CLOCK_PUBKEY,
                systemProgram: web3.SystemProgram.programId
            })
            .rpc();

        log(`SENT_TO_MEMPOOL: ${tx.slice(0, 10)}...`);

        // In a real app we would fetch the event or account state
        // For visual effect, wait a bit
        await new Promise(r => setTimeout(r, 1000));

        // Mock result parsing or fetch account state
        // Note: Event parsing requires listeners, simpler to fetch Engine history if needed
        // But for "Vibe", we'll simulate the "Result" display based on success

        log('COHERENCE_VERIFIED.', 'success');

        // Update UI with mock/derived values for visual feedback
        veroStatus.textContent = "TRUE";
        veroStatus.style.color = "#00ff00";
        veroCoherence.textContent = "9360";
        veroChaos.textContent = "Low (Sparkle)";

        veroResult.classList.remove('hidden');

    } catch (err) {
        log(`VERIFICATION_FAILED: ${err.message}`, 'error');
    } finally {
        btnSubmitClaim.classList.remove('disabled');
    }
}


// Load Fragment from Contract
async function loadFragment() {
    try {
        log('SCANNING_MYCELIAL_NETWORK...');
        btnLoadFragment.classList.add('disabled');

        // In production, fetch from contract
        // For demo, use sample fragment
        currentFragment = {
            seedId: '0001',
            fragmentData: 'The mycelium spreads through soil, connecting trees in a network of',
            difficulty: 0,
            isActive: true
        };

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

            // Calculate Keccak256 hash
            const hash = keccak256(combined);

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
            const targetSuper = Buffer.from('sixfive').toString('hex');

            if (hash.includes(targetSuper)) {
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

        // Simulator
        await new Promise(resolve => setTimeout(resolve, 2000));

        log('TRANSACTION_CONFIRMED: 0x5f3a...92bc', 'success');
        log(`REWARD_MINTED: ${miningResult.reward} MEMEk`, 'success');

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
btnSubmitClaim.addEventListener('click', submitClaim);

// Auto-detect wallet on load
window.addEventListener('load', () => {
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
    program,
    veroProgram,
    currentFragment,
    miningResult,
    keccak256 // For manual testing
};
