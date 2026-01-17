import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemEk } from "../target/types/mem_ek";

async function main() {
    // Configure the client for X1 Mainnet
    if (!process.env.ANCHOR_PROVIDER_URL) {
        process.env.ANCHOR_PROVIDER_URL = "https://rpc.mainnet.x1.xyz";
    }
    if (!process.env.ANCHOR_WALLET) {
        process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";
    }
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.MemEk as Program<MemEk>;

    // MoonParty Kernel Parameters
    // seed_id: 420 (lunar vibes)
    // difficulty: 7 (moderate resonance requirement)
    // fragment: The gap to be bridged
    const seedId = new anchor.BN(420);
    const difficulty = 7;
    const fragmentData = "MoonParty: A big party on the moon where even BTC and ETH ______";

    // Generate Keypairs for the accounts
    const kernelSeed = anchor.web3.Keypair.generate();
    const evolutionState = anchor.web3.Keypair.generate();

    console.log("===========================================");
    console.log("  MEMEk Kernel Initialization: MoonParty");
    console.log("===========================================");
    console.log("");
    console.log("Network: X1 Mainnet");
    console.log("Kernel Seed Pubkey:", kernelSeed.publicKey.toBase58());
    console.log("Evolution State Pubkey:", evolutionState.publicKey.toBase58());
    console.log("");
    console.log("Fragment: MoonParty");
    console.log("Description: A big party on the moon where even BTC and ETH linked up");
    console.log("");

    // Initialize the kernel on-chain
    const tx = await program.methods
        .initializeKernel(seedId, difficulty, fragmentData)
        .accounts({
            kernelSeed: kernelSeed.publicKey,
            evolutionState: evolutionState.publicKey,
            user: provider.wallet.publicKey,
        })
        .signers([kernelSeed, evolutionState])
        .rpc();

    console.log("Kernel Initialized!");
    console.log("Transaction Signature:", tx);
    console.log("");
    console.log("=== MoonParty Fragment Details ===");
    console.log("Seed ID:", seedId.toString());
    console.log("Difficulty:", difficulty);
    console.log("Gap to Bridge:", fragmentData);
    console.log("");
    console.log("The tribes converge under lunar gravity.");
    console.log("BTC and ETH, united at last.");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
