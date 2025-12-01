document.addEventListener('DOMContentLoaded', () => {
    const consoleOutput = document.getElementById('console-output');
    const btnConnect = document.getElementById('btn-connect');
    const btnInit = document.getElementById('btn-init');
    const btnMine = document.getElementById('btn-mine');
    const btnBridge = document.getElementById('btn-bridge');
    const statusConn = document.getElementById('connection-status');

    let isConnected = false;

    function log(message) {
        const line = document.createElement('div');
        line.className = 'line';
        line.textContent = `> ${message}`;
        consoleOutput.insertBefore(line, consoleOutput.lastElementChild);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    btnConnect.addEventListener('click', async () => {
        if (isConnected) return;

        log('INITIATING_HANDSHAKE...');

        // Simulate wallet connection delay
        setTimeout(() => {
            isConnected = true;
            statusConn.textContent = 'CONNECTED: 0x8F...3A21';
            statusConn.style.color = 'var(--term-green)';
            btnConnect.querySelector('.btn-text').textContent = 'WALLET_LINKED';
            btnConnect.classList.add('disabled');

            btnInit.classList.remove('disabled');
            log('UPLINK_ESTABLISHED. READY_TO_INIT.');
        }, 1000);
    });

    btnInit.addEventListener('click', () => {
        if (!isConnected) return;
        log('INITIALIZING_KERNEL_SEED...');

        setTimeout(() => {
            log('KERNEL_ACTIVE. SEED_ID: #0001');
            log('DIFFICULTY: 0 (GENESIS)');
            btnInit.classList.add('disabled');
            btnMine.classList.remove('disabled');
        }, 1500);
    });

    btnMine.addEventListener('click', () => {
        log('STARTING_HASH_SEQUENCE...');
        let attempts = 0;
        const maxAttempts = 20;

        const interval = setInterval(() => {
            const randomHash = '0x' + Math.random().toString(16).substr(2, 64);
            log(`HASHING: ${randomHash.substr(0, 20)}...`);
            attempts++;

            if (attempts >= maxAttempts) {
                clearInterval(interval);
                log('PATTERN_MATCH_FOUND: "65"');
                log('RESONANCE_DETECTED.');
                btnMine.classList.add('disabled');
                btnBridge.classList.remove('disabled');
            }
        }, 100);
    });

    btnBridge.addEventListener('click', () => {
        log('BRIDGING_GAP...');

        setTimeout(() => {
            log('TRANSACTION_CONFIRMED.');
            log('REWARD_MINTED: 650 MEMEk');

            // Update stats
            document.getElementById('resonance-score').textContent = '0650';
            document.getElementById('gaps-bridged').textContent = '1';

            btnBridge.classList.add('disabled');
            btnMine.classList.remove('disabled'); // Allow mining again
            log('READY_FOR_NEXT_CYCLE.');
        }, 2000);
    });
});
