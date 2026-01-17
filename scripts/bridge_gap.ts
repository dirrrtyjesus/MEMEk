import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";

// Load IDL
const idlPath = path.join(__dirname, "../target/idl/mem_ek.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

// Program ID
const PROGRAM_ID = new PublicKey("EwnLc8CGcwkRLpKwATuiwypcH8oqdpfAskSo4Cvb2qZe");

// Keccak256 implementation
function keccak256(data: Buffer): Buffer {
    const { Keccak } = require("sha3");
    const hash = new Keccak(256);
    hash.update(data);
    return hash.digest();
}

function checkCompletion(fragmentData: string, completion: string): { valid: boolean; hash: string; isSuper: boolean } {
    const combined = `${fragmentData}${completion}`;
    const hash = keccak256(Buffer.from(combined));
    const hashHex = hash.toString("hex");

    if (hashHex.includes("73697866697665")) {
        return { valid: true, hash: hashHex, isSuper: true };
    }
    if (hashHex.includes("65")) {
        return { valid: true, hash: hashHex, isSuper: false };
    }
    return { valid: false, hash: hashHex, isSuper: false };
}

function findValidCompletion(fragmentData: string, baseCompletion: string): { completion: string; hash: string } | null {
    console.log(`\nMining for valid completion...`);
    console.log(`Fragment: "${fragmentData}"`);
    console.log(`Base: "${baseCompletion}"`);

    // Try the base completion first
    let result = checkCompletion(fragmentData, baseCompletion);
    if (result.valid) {
        console.log(`Base completion valid! Hash: ${result.hash}`);
        if (result.isSuper) console.log(`SUPERHASH! Reward: 65,000 tokens`);
        else console.log(`Pattern "65" found. Reward: 650 tokens`);
        return { completion: baseCompletion, hash: result.hash };
    }

    // Try variations to find a valid hash
    const suffixes = ["", "!", ".", "!!", " yo", " fr", " lol", " tbh", " ngl", " rn", " tho", "...", " :)"];
    for (let i = 0; i < 500; i++) {
        for (const suffix of suffixes) {
            const completion = `${baseCompletion}${suffix}${i > 0 ? i : ""}`;
            result = checkCompletion(fragmentData, completion);
            if (result.valid) {
                console.log(`\nFound valid completion: "${completion}"`);
                console.log(`Hash: ${result.hash}`);
                if (result.isSuper) console.log(`SUPERHASH! Reward: 65,000 tokens`);
                else console.log(`Pattern "65" found. Reward: 650 tokens`);
                return { completion, hash: result.hash };
            }
        }
        if (i % 100 === 0 && i > 0) {
            process.stdout.write(`\rChecked ${i * suffixes.length} variations...`);
        }
    }
    return null;
}

async function main() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  BRIDGE THE GAP - MoonParty");
    console.log("  The tribes converge under lunar gravity");
    console.log("═══════════════════════════════════════════════════════════");

    // Load wallet
    const walletPath = process.env.HOME + "/.config/solana/id.json";
    const walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf8")))
    );

    console.log(`\nWallet: ${walletKeypair.publicKey.toBase58()}`);

    // Setup connection
    const connection = new Connection("https://rpc.mainnet.x1.xyz", "confirmed");
    const wallet = new Wallet(walletKeypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);

    // @ts-ignore - dynamic IDL loading
    const program = new Program(idl, provider);

    // MoonParty kernel addresses
    const kernelSeedPubkey = new PublicKey("8QkacSiBofgH5aULiJLE5nQA34mBZv7mW995LZUFfCZn");
    const mintPubkey = new PublicKey("BYuhFXADPSeEgz9ibpcywTqFEsqVu5Fn1FEqECMR7hKp");

    // The fragment to complete
    const fragmentData = "MoonParty: A big party on the moon where even BTC and ETH ______";

    // Your completion - fill in the blank!
    const baseCompletion = process.argv[2] || "linked up and danced until Earth-rise";
    console.log(`Your completion: "${baseCompletion}"`);

    // Find a valid completion
    const result = findValidCompletion(fragmentData, baseCompletion);

    if (!result) {
        console.log("\n\nNo valid hash found. Try a different completion!");
        process.exit(1);
    }

    const finalCompletion = result.completion;

    // Derive PDAs
    const [mintAuthority] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint_authority")],
        PROGRAM_ID
    );

    const [resonance] = PublicKey.findProgramAddressSync(
        [Buffer.from("resonance"), kernelSeedPubkey.toBuffer()],
        PROGRAM_ID
    );

    const [userScore] = PublicKey.findProgramAddressSync(
        [Buffer.from("score"), walletKeypair.publicKey.toBuffer()],
        PROGRAM_ID
    );

    // Use Token-2022 program for this mint
    const userTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        walletKeypair.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("\n--- Submitting to chain ---\n");

    try {
        // Check if token account exists
        const tokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
        let preInstructions: anchor.web3.TransactionInstruction[] = [];
        if (!tokenAccountInfo) {
            console.log("Creating token account...");
            preInstructions.push(
                createAssociatedTokenAccountInstruction(
                    walletKeypair.publicKey,
                    userTokenAccount,
                    walletKeypair.publicKey,
                    mintPubkey,
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )
            );
        }

        // Use bridgeGap2022 for Token-2022 mints
        const tx = await program.methods
            .bridgeGap2022(finalCompletion, new anchor.BN(0))
            .accounts({
                user: walletKeypair.publicKey,
                kernelSeed: kernelSeedPubkey,
                mint: mintPubkey,
                userTokenAccount: userTokenAccount,
                mintAuthority: mintAuthority,
                resonance: resonance,
                userScore: userScore,
                tokenProgram: TOKEN_2022_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .preInstructions(preInstructions)
            .rpc();

        console.log("═══════════════════════════════════════════════════════════");
        console.log("  GAP BRIDGED!");
        console.log("═══════════════════════════════════════════════════════════");
        console.log("");
        console.log("Transaction:", tx);
        console.log("");
        console.log(`Fragment: "${fragmentData}"`);
        console.log(`Completion: "${finalCompletion}"`);
        console.log(`Full: "${fragmentData.replace("______", finalCompletion)}"`);
        console.log("");
        console.log("The moon remembers. The tribes are united.");
        console.log("═══════════════════════════════════════════════════════════");
        console.log(`\nExplorer: https://explorer.mainnet.x1.xyz/tx/${tx}`);

    } catch (err: any) {
        if (err.message?.includes("CompletionLacksResonance")) {
            console.log("\nCompletion lacks resonance - hash mismatch on-chain.");
        } else {
            console.error("\nError bridging gap:", err.message || err);
            if (err.logs) console.error("Logs:", err.logs);
        }
        process.exit(1);
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
