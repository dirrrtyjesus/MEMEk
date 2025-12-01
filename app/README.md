# MEMEk Frontend - Gap Bridging Interface

A cyberpunk-themed web interface for interacting with the MEMEk smart contract on Solana.

## Features

### Visual Design
- **CRT Monitor Aesthetic**: Scanlines, phosphor glow, terminal-style interface
- **Glitch Effects**: Dynamic text glitching on headers
- **Real-time Console**: Live transaction and mining feedback
- **Animated Stats**: Pulsing indicators and progress bars

### Core Functionality

1. **Wallet Connection**
   - Phantom wallet integration
   - Auto-detection of installed wallets
   - Connection status display

2. **Fragment Loading**
   - Fetch incomplete kernel fragments from contract
   - Display seed ID, difficulty, and fragment text
   - Randomized fragment selection (demo mode)

3. **Harmonic Mining**
   - Client-side Keccak256 hash mining
   - Search for harmonic patterns ("65" or "sixfive")
   - Configurable mining iterations (100-10,000)
   - Real-time progress tracking
   - Hash preview during mining

4. **Gap Bridging**
   - Submit mined completions to smart contract
   - Automatic token reward minting
   - User resonance score tracking
   - Transaction confirmation display

## Usage

### Quick Start

1. **Open in Browser**
   ```bash
   # Serve with any static file server
   python -m http.server 8000
   # or
   npx serve .
   ```

2. **Navigate to** `http://localhost:8000`

3. **Connect Phantom Wallet**
   - Install Phantom if needed: https://phantom.app/
   - Click "CONNECT_WALLET"
   - Approve connection in Phantom popup

4. **Load Fragment**
   - Click "LOAD_FRAGMENT"
   - View the incomplete kernel text

5. **Complete & Mine**
   - Enter your creative completion in the text area
   - Adjust mining iterations if needed
   - Click "MINE_PATTERN"
   - Wait for harmonic resonance detection

6. **Bridge Gap**
   - Once a pattern is found, click "BRIDGE_GAP"
   - Confirm transaction in Phantom
   - Receive MEMEk token rewards

## Mining Mechanics

### Harmonic Patterns

The system searches for two patterns in hash outputs:

**Normal Pattern**: `"65"`
- Reward: 650 MEMEk
- Represents the Minor Third ratio (6:5)
- More common, typically found in 100-1000 attempts

**Superhash Pattern**: `"sixfive"` (hex: 736978666976 65)
- Reward: 65,000 MEMEk
- Extremely rare
- May require 10,000+ attempts

### Mining Process

```javascript
combined_text = fragment + completion + salt
hash = keccak256(combined_text)

if hash.contains("736978666976 65"):
    reward = 65,000 MEMEk
else if hash.contains("65"):
    reward = 650 MEMEk
else:
    increment salt and try again
```

### Optimization Tips

- **Iteration Count**: Start with 1,000 for quick results
- **Completion Length**: Longer text = more entropy = better chances
- **Pattern Frequency**: "65" appears in ~1-2% of hashes
- **Superhash Rarity**: May never appear in 10,000 attempts

## File Structure

```
app/
├── index.html              # Main interface
├── style.css               # Cyberpunk/CRT styling
├── script-browser.js       # Browser-compatible version (CDN dependencies)
├── script.js               # Module version (for bundlers)
└── README.md              # This file
```

## Dependencies (Loaded via CDN)

- **@solana/web3.js**: Solana blockchain interaction
- **js-sha3**: Keccak256 hashing for mining

## Integration with Smart Contract

### Demo Mode (Current)
- Uses sample fragments
- Simulates transaction submission
- Tracks stats locally

### Production Mode (TODO)
To enable real contract interaction:

1. **Add Program IDL**
   ```javascript
   import idl from './memek_idl.json';
   const program = new Program(idl, PROGRAM_ID, provider);
   ```

2. **Load Real Fragments**
   ```javascript
   const kernelSeed = await program.account.kernelSeed.fetch(seedPubkey);
   currentFragment = {
       seedId: kernelSeed.seedId.toString(),
       fragmentData: kernelSeed.fragmentData,
       difficulty: kernelSeed.difficulty,
       isActive: kernelSeed.isActive
   };
   ```

3. **Submit Transactions**
   ```javascript
   const tx = await program.methods
       .bridgeGap(completion, new BN(salt))
       .accounts({
           user: wallet,
           kernelSeed: seedPubkey,
           // ... other accounts
       })
       .rpc();
   ```

## Customization

### Fragments
Edit `script-browser.js` line ~125 to add/modify fragments:

```javascript
const fragments = [
    {
        seedId: '0005',
        fragmentData: 'Your custom incomplete text goes',
        difficulty: 0,
        isActive: true
    }
];
```

### Styling
Modify CSS variables in `style.css`:

```css
:root {
    --bg-color: #0a0a0a;
    --term-green: #0f0;
    --accent-purple: #b026ff;
    --accent-red: #ff003c;
}
```

### Mining Difficulty
Adjust pattern matching in `minePattern()`:

```javascript
// Search for different patterns
if (hash.includes('yourpattern')) {
    reward = 1000;
    // ...
}
```

## Troubleshooting

**Wallet won't connect**
- Ensure Phantom is installed and unlocked
- Check console for errors
- Try refreshing the page

**Mining takes too long**
- Reduce iterations to 100-500
- Pattern "65" is relatively common
- Check hash preview is updating

**No pattern found**
- Increase iterations to 2,000-5,000
- Try different completion text
- "65" should appear within 1,000 attempts statistically

**Transaction fails**
- Ensure sufficient SOL for gas fees
- Check wallet is connected to correct network
- Verify program is deployed on X1 network

## Development

### Local Testing
```bash
# Serve locally
python -m http.server 8000

# Open browser
open http://localhost:8000
```

### Console Debugging
Access debug tools via browser console:

```javascript
// View current state
window.memek

// Manual hash testing
sha3.keccak256('test string')

// Check wallet connection
window.solana.isConnected
```

## Mycelial Philosophy

The interface embodies the MEMEk core principles:

- **Participatory Incompleteness**: Users must complete the gaps
- **Constraint-Based Mining**: Limited iterations force creative constraint
- **Harmonic Resonance**: Musical ratios (6:5) as validation
- **Terminal Aesthetics**: Retro-futuristic, mycelial network visualization

The mining process itself is a meditation on constraint as generative force—finding harmony through limitation.

---

**Status**: `ACTIVE | EPOCH_0 | MINING_ENABLED`

*"Constraint is not obstacle—it is oracle."*
