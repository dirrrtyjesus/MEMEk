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

    // SPL Token constants
    const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
    const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
    const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

    // Available Kernels
    const KERNELS = {
        augLABS: {
            name: 'augLABS',
            kernelSeed: '8F7wySNTc3ZYE9YCWHgbvRLsQeSPVUN3wq1431nci2xN',
            evolutionState: 'HFJkw6sd1vDdEXDgwhYTt7FWDYtaquwv6tfY2mDsAf94',
            mint: '4r2Thygw2bUUpu1b8xDDi6gd89DdjmuA84ZkVN8sKgkx',
            isToken2022: false,
            fragmentData: 'augLABS',
            seedId: '0065',
            difficulty: 0
        },
        moonparty: {
            name: 'MoonParty',
            kernelSeed: '8QkacSiBofgH5aULiJLE5nQA34mBZv7mW995LZUFfCZn',
            evolutionState: '7rJbJp21wb9VbY3wvT2V6RLYyVfB5W9TovJmsCQKuPZe',
            mint: 'BYuhFXADPSeEgz9ibpcywTqFEsqVu5Fn1FEqECMR7hKp',
            isToken2022: true,
            fragmentData: 'MoonParty: A big party on the moon where even BTC and ETH ______',
            seedId: '0420',
            difficulty: 7
        }
    };

    // Currently selected kernel
    let selectedKernel = KERNELS.moonparty;

    // State
    let wallet = null;
    let walletAdapter = null; // The wallet adapter being used
    let walletPublicKey = null; // PublicKey object
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

    // Helper: Text to Uint8Array (browser-compatible Buffer alternative)
    function textToBytes(text) {
        return new TextEncoder().encode(text);
    }

    // Helper: Find PDA
    function findPDA(seeds, programId) {
        return solanaWeb3.PublicKey.findProgramAddressSync(seeds, programId);
    }

    // Helper: Get Associated Token Address (supports both Token and Token-2022)
    function getAssociatedTokenAddress(mint, owner, isToken2022 = false) {
        const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        const [address] = findPDA(
            [
                owner.toBytes(),
                new solanaWeb3.PublicKey(tokenProgramId).toBytes(),
                mint.toBytes(),
            ],
            new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID)
        );
        return address;
    }

    // Helper: Create Associated Token Account instruction (supports Token-2022)
    function createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint, isToken2022 = false) {
        const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: associatedToken, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: false, isWritable: false },
                { pubkey: mint, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: new solanaWeb3.PublicKey(tokenProgramId), isSigner: false, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID),
            data: new Uint8Array(0),
        });
    }

    // Helper: Check if account exists
    async function accountExists(pubkey) {
        try {
            const info = await connection.getAccountInfo(pubkey);
            return info !== null;
        } catch {
            return false;
        }
    }

    // Helper: Encode u32 little-endian
    function encodeU32LE(value) {
        const buf = new Uint8Array(4);
        buf[0] = value & 0xff;
        buf[1] = (value >> 8) & 0xff;
        buf[2] = (value >> 16) & 0xff;
        buf[3] = (value >> 24) & 0xff;
        return buf;
    }

    // Helper: Encode u64 little-endian
    function encodeU64LE(value) {
        const buf = new Uint8Array(8);
        const bigVal = BigInt(value);
        for (let i = 0; i < 8; i++) {
            buf[i] = Number((bigVal >> BigInt(i * 8)) & BigInt(0xff));
        }
        return buf;
    }

    // Helper: Concat Uint8Arrays
    function concatBytes(...arrays) {
        const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }

    // Detect available wallets
    function getAvailableWallets() {
        const wallets = [];

        // Phantom
        if (window.solana?.isPhantom) {
            wallets.push({ name: 'Phantom', adapter: window.solana, icon: 'phantom' });
        }
        // Solflare
        if (window.solflare?.isSolflare) {
            wallets.push({ name: 'Solflare', adapter: window.solflare, icon: 'solflare' });
        }
        // Backpack
        if (window.backpack?.isBackpack) {
            wallets.push({ name: 'Backpack', adapter: window.backpack, icon: 'backpack' });
        }
        // Glow
        if (window.glow?.isGlow) {
            wallets.push({ name: 'Glow', adapter: window.glow, icon: 'glow' });
        }
        // Generic solana adapter (fallback for other wallets)
        if (window.solana && !window.solana.isPhantom && wallets.length === 0) {
            wallets.push({ name: 'Solana Wallet', adapter: window.solana, icon: 'generic' });
        }

        return wallets;
    }

    // Show wallet selection modal
    function showWalletSelector(wallets) {
        return new Promise((resolve) => {
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'wallet-modal';
            modal.innerHTML = `
                <div class="wallet-modal-content">
                    <div class="wallet-modal-header">SELECT_WALLET</div>
                    <div class="wallet-list">
                        ${wallets.map((w, i) => `
                            <button class="wallet-option cyber-btn" data-index="${i}">
                                <span class="btn-text">${w.name.toUpperCase()}</span>
                            </button>
                        `).join('')}
                    </div>
                    <button class="wallet-cancel cyber-btn" style="margin-top: 1rem; width: 100%;">
                        <span class="btn-text">CANCEL</span>
                    </button>
                </div>
            `;

            // Style the modal
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.85); display: flex;
                align-items: center; justify-content: center; z-index: 9999;
            `;
            const content = modal.querySelector('.wallet-modal-content');
            content.style.cssText = `
                background: var(--bg-secondary, #1a1a2e); padding: 2rem;
                border: 1px solid var(--term-green, #00ff41); min-width: 280px;
            `;
            const header = modal.querySelector('.wallet-modal-header');
            header.style.cssText = `
                color: var(--term-green, #00ff41); margin-bottom: 1rem;
                font-size: 1.2rem; text-align: center;
            `;
            const list = modal.querySelector('.wallet-list');
            list.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';

            document.body.appendChild(modal);

            // Handle selection
            modal.querySelectorAll('.wallet-option').forEach(btn => {
                btn.addEventListener('click', () => {
                    const idx = parseInt(btn.dataset.index);
                    document.body.removeChild(modal);
                    resolve(wallets[idx]);
                });
            });

            modal.querySelector('.wallet-cancel').addEventListener('click', () => {
                document.body.removeChild(modal);
                resolve(null);
            });
        });
    }

    // Wallet Connection
    async function connectWallet() {
        try {
            log('SCANNING_FOR_WALLETS...');

            const wallets = getAvailableWallets();

            if (wallets.length === 0) {
                log('NO_SOLANA_WALLET_DETECTED.', 'error');
                log('INSTALL: PHANTOM, SOLFLARE, BACKPACK, OR GLOW', 'error');
                return;
            }

            let selectedWallet;
            if (wallets.length === 1) {
                selectedWallet = wallets[0];
                log(`DETECTED: ${selectedWallet.name.toUpperCase()}`);
            } else {
                log(`FOUND ${wallets.length} WALLETS. SELECT_ONE...`);
                selectedWallet = await showWalletSelector(wallets);
                if (!selectedWallet) {
                    log('CONNECTION_CANCELLED.', 'error');
                    return;
                }
            }

            log(`INITIATING_${selectedWallet.name.toUpperCase()}_HANDSHAKE...`);

            // Connect
            const response = await selectedWallet.adapter.connect();
            walletPublicKey = response.publicKey;
            wallet = walletPublicKey.toString();
            walletAdapter = selectedWallet.adapter;

            // Setup connection
            connection = new solanaWeb3.Connection(X1_RPC, 'confirmed');

            log(`UPLINK_ESTABLISHED: ${wallet.slice(0, 8)}...`, 'success');
            log(`KERNEL: ${selectedKernel.name.toUpperCase()}`);
            statusConn.textContent = `CONNECTED: ${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
            statusConn.style.color = 'var(--term-green)';

            btnConnect.querySelector('.btn-text').textContent = `${selectedWallet.name.toUpperCase()}_LINKED`;
            btnConnect.classList.add('disabled');
            btnLoadFragment.classList.remove('disabled');

        } catch (error) {
            log(`CONNECTION_FAILED: ${error.message}`, 'error');
        }
    }

    // Load Fragment from selected kernel
    async function loadFragment() {
        try {
            log('SCANNING_MYCELIAL_NETWORK...');
            btnLoadFragment.classList.add('disabled');

            // Use selected kernel's fragment
            currentFragment = {
                seedId: selectedKernel.seedId,
                fragmentData: selectedKernel.fragmentData,
                difficulty: selectedKernel.difficulty,
                isActive: true,
                kernelSeed: selectedKernel.kernelSeed,
                isToken2022: selectedKernel.isToken2022,
                mint: selectedKernel.mint
            };

            log(`KERNEL: ${selectedKernel.name.toUpperCase()}`);
            log(`TOKEN: ${selectedKernel.isToken2022 ? 'TOKEN-2022' : 'SPL_TOKEN'}`);

            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // For MoonParty, show the gap to fill
            if (selectedKernel.fragmentData.includes('______')) {
                fragmentText.textContent = selectedKernel.fragmentData;
            } else {
                fragmentText.textContent = currentFragment.fragmentData + ' ___';
            }
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

    // Switch kernel
    function selectKernel(kernelKey) {
        if (KERNELS[kernelKey]) {
            selectedKernel = KERNELS[kernelKey];
            log(`KERNEL_SELECTED: ${selectedKernel.name.toUpperCase()}`);
            return true;
        }
        return false;
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

    // Bridge Gap - Submit to Contract (REAL ON-CHAIN)
    async function bridgeGap() {
        console.log('bridgeGap called', { miningResult, walletPublicKey, currentFragment });
        try {
            if (!miningResult) {
                log('NO_MINING_RESULT_AVAILABLE.', 'error');
                return;
            }

            if (!walletPublicKey || !walletAdapter) {
                log('WALLET_NOT_CONNECTED.', 'error');
                return;
            }

            log('BUILDING_TRANSACTION...');
            btnBridge.classList.add('disabled');

            // Debug log wallet adapter capabilities
            console.log('Wallet adapter:', walletAdapter);
            console.log('signTransaction:', typeof walletAdapter.signTransaction);
            console.log('signAndSendTransaction:', typeof walletAdapter.signAndSendTransaction);

            const programId = new solanaWeb3.PublicKey(PROGRAM_ID_STR);
            const kernelSeed = new solanaWeb3.PublicKey(currentFragment.kernelSeed);
            const mint = new solanaWeb3.PublicKey(currentFragment.mint);
            const isToken2022 = currentFragment.isToken2022;

            // Derive PDAs
            const [mintAuthority] = findPDA([textToBytes('mint_authority')], programId);
            const [resonance] = findPDA([textToBytes('resonance'), kernelSeed.toBytes()], programId);
            const [userScore] = findPDA([textToBytes('score'), walletPublicKey.toBytes()], programId);

            // Get user's token account (Associated Token Account)
            const userTokenAccount = getAssociatedTokenAddress(mint, walletPublicKey, isToken2022);
            const tokenProgramId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

            log(`TOKEN_ACCOUNT: ${userTokenAccount.toString().slice(0, 8)}...`);
            log(`TOKEN_PROGRAM: ${isToken2022 ? 'TOKEN_2022' : 'SPL_TOKEN'}`);

            // Build transaction
            const transaction = new solanaWeb3.Transaction();

            // Check if user token account exists, if not, create it
            const tokenAccountExists = await accountExists(userTokenAccount);
            if (!tokenAccountExists) {
                log('CREATING_TOKEN_ACCOUNT...');
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        walletPublicKey,
                        userTokenAccount,
                        walletPublicKey,
                        mint,
                        isToken2022
                    )
                );
            }

            // Build bridge_gap instruction
            // Discriminator for bridge_gap: sha256("global:bridge_gap")[0..8] = [89, 235, 243, 29, 253, 197, 165, 30]
            // Discriminator for bridge_gap_2022: sha256("global:bridge_gap_2022")[0..8] = [172, 2, 222, 9, 12, 191, 175, 202]
            const discriminator = isToken2022
                ? new Uint8Array([172, 2, 222, 9, 12, 191, 175, 202])
                : new Uint8Array([89, 235, 243, 29, 253, 197, 165, 30]);

            // The contract combines: fragment_data + completion_text, then hashes with salt appended
            // So we send: completion_text (what user typed) + salt (the winning nonce as string)
            // This matches how mining works: baseText + salt.toString()
            const completionWithSalt = miningResult.completion + miningResult.salt.toString();
            const completionBytes = textToBytes(completionWithSalt);
            const completionLen = encodeU32LE(completionBytes.length);

            // Salt as u64 (the nonce that found the pattern)
            const saltBytes = encodeU64LE(miningResult.salt);

            // Combine instruction data
            const instructionData = concatBytes(
                discriminator,
                completionLen,
                completionBytes,
                saltBytes
            );

            log(`COMPLETION: "${completionWithSalt.slice(0, 20)}..." SALT: ${miningResult.salt}`);

            // Create the bridge_gap instruction
            const bridgeGapIx = new solanaWeb3.TransactionInstruction({
                keys: [
                    { pubkey: walletPublicKey, isSigner: true, isWritable: true },
                    { pubkey: kernelSeed, isSigner: false, isWritable: true },
                    { pubkey: mint, isSigner: false, isWritable: true },
                    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
                    { pubkey: mintAuthority, isSigner: false, isWritable: false },
                    { pubkey: resonance, isSigner: false, isWritable: true },
                    { pubkey: userScore, isSigner: false, isWritable: true },
                    { pubkey: new solanaWeb3.PublicKey(tokenProgramId), isSigner: false, isWritable: false },
                    { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                ],
                programId: programId,
                data: instructionData,
            });

            transaction.add(bridgeGapIx);

            // Get recent blockhash
            log('FETCHING_BLOCKHASH...');
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletPublicKey;

            // Sign and send via wallet adapter
            log('REQUESTING_SIGNATURE...');

            let signature;

            // Try signAndSendTransaction first (preferred by Backpack, Phantom)
            if (walletAdapter.signAndSendTransaction) {
                log('USING_SIGN_AND_SEND...');
                try {
                    const { signature: sig } = await walletAdapter.signAndSendTransaction(transaction, {
                        skipPreflight: true  // Skip to see actual on-chain error
                    });
                    signature = sig;
                } catch (e) {
                    // Fall back to signTransaction
                    log('FALLBACK_TO_SIGN_TRANSACTION...');
                    const signed = await walletAdapter.signTransaction(transaction);
                    signature = await connection.sendRawTransaction(signed.serialize(), {
                        skipPreflight: true,
                        preflightCommitment: 'confirmed'
                    });
                }
            } else {
                // Use signTransaction + sendRawTransaction
                const signed = await walletAdapter.signTransaction(transaction);
                log('BROADCASTING_TRANSACTION...');
                signature = await connection.sendRawTransaction(signed.serialize(), {
                    skipPreflight: true,  // Skip to see actual on-chain error
                    preflightCommitment: 'confirmed'
                });
            }

            log(`TX_SENT: ${signature.slice(0, 12)}...`);
            log('AWAITING_CONFIRMATION...');

            // Wait for confirmation
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
            }

            log(`TX_CONFIRMED: ${signature.slice(0, 16)}...`, 'success');
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
            console.error('Bridge error:', error);
            btnBridge.classList.remove('disabled');
        }
    }

    // Kernel selector
    const kernelSelect = document.getElementById('kernel-select');

    // Event Listeners
    btnConnect.addEventListener('click', connectWallet);
    btnLoadFragment.addEventListener('click', loadFragment);
    btnMine.addEventListener('click', minePattern);
    btnBridge.addEventListener('click', () => {
        console.log('Bridge button clicked');
        bridgeGap();
    });
    console.log('Event listeners attached', { btnBridge, btnMine, btnConnect, btnLoadFragment });

    // Kernel selection change
    kernelSelect.addEventListener('change', (e) => {
        const kernelKey = e.target.value;
        if (selectKernel(kernelKey)) {
            // Reset any loaded fragment
            currentFragment = null;
            miningResult = null;
            gapInterface.classList.add('hidden');
            resultPanel.classList.add('hidden');
            btnMine.classList.add('disabled');
            btnBridge.classList.add('disabled');
            miningProgress.style.width = '0%';
            miningStats.textContent = 'Ready to mine...';
            hashPreview.textContent = '0x...';
            completionInput.value = '';
        }
    });

    // Auto-detect wallet on load
    window.addEventListener('load', () => {
        console.log('MEMEk initialized. Dependencies:', {
            keccak_256: typeof keccak_256,
            solanaWeb3: typeof solanaWeb3
        });

        const wallets = getAvailableWallets();
        if (wallets.length > 0) {
            const names = wallets.map(w => w.name.toUpperCase()).join(', ');
            log(`WALLET(S)_DETECTED: ${names}`);
        } else {
            log('NO_WALLET_DETECTED. INSTALL_SOLANA_WALLET.');
        }
        log(`DEFAULT_KERNEL: ${selectedKernel.name.toUpperCase()}`);
        log(`AVAILABLE: ${Object.keys(KERNELS).map(k => KERNELS[k].name).join(', ')}`);
    });

    // Export for debugging
    window.memek = {
        wallet,
        walletAdapter,
        connection,
        currentFragment,
        miningResult,
        selectedKernel,
        KERNELS,
        selectKernel,
        keccak_256 // For manual testing
    };
})();
