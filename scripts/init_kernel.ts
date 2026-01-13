import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemEk } from "../target/types/mem_ek";

async function main() {
    // Configure the client to use the local cluster.
    if (!process.env.ANCHOR_PROVIDER_URL) {
        process.env.ANCHOR_PROVIDER_URL = "https://rpc.mainnet.x1.xyz";
    }
    if (!process.env.ANCHOR_WALLET) {
        process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";
    }
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.MemEk as Program<MemEk>;

    // 1. Define the Kernel Seed parameters
    const seedId = new anchor.BN(65);
    const difficulty = 0; //
    const fragmentData = "augLABS"; // augLABS pattern


     // 2. Generate Keypairs for the accounts
    // In a real deployment, you might want to use deterministic addresses or save these keypairs
    const kernelSeed = anchor.web3.Keypair.generate();
    const evolutionState = anchor.web3.Keypair.generate();

    console.log("Initializing Kernel...");
    console.log("Kernel Seed Pubkey:", kernelSeed.publicKey.toBase58());
    console.log("Evolution State Pubkey:", evolutionState.publicKey.toBase58());

    // 3. Send the transaction
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
    console.log("Seed ID:", seedId.toString());
    console.log("Difficulty:", difficulty);
    console.log("Fragment:", fragmentData);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
