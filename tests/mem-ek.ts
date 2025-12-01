import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MemEk } from "../target/types/mem_ek";
import { keccak256 } from "js-sha3";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";

describe("mem-ek", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.memEk as Program<MemEk>;

  it("Initializes Kernel and Bridges Gap with Minting", async () => {
    const kernelSeed = anchor.web3.Keypair.generate();
    const evolutionState = anchor.web3.Keypair.generate();
    const user = provider.wallet;

    // Create Mint
    // In a real scenario, the mint authority would be the program PDA.
    // Here we need to create the mint first.
    // Since the program expects to be the authority, we might need to transfer authority or
    // just create it with the PDA as authority initially.

    const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    const mint = await createMint(
      provider.connection,
      (user as any).payer,
      mintAuthorityPDA,
      null,
      9
    );
    console.log("Mint created:", mint.toBase58());

    const seedId = new anchor.BN(1);
    const difficulty = 0;
    const fragmentData = "The future is ";

    await program.methods
      .initializeKernel(seedId, difficulty, fragmentData)
      .accounts({
        kernelSeed: kernelSeed.publicKey,
        evolutionState: evolutionState.publicKey,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([kernelSeed, evolutionState])
      .rpc();

    console.log("Kernel initialized");

    // Bridge Gap
    // We need to find a completion text that, when combined with fragmentData,
    // produces a Keccak256 hash containing "420" (since difficulty is 0).

    let completionText = "";
    let salt = new anchor.BN(0); // Salt is unused in current logic but kept for interface

    // Simple mining loop
    const target = "65";
    let found = false;
    let i = 0;

    // Use a library for keccak256 or just try random strings if we can import one.
    // Since we are in JS/TS test, we can use 'js-sha3' or similar if available,
    // or just rely on the fact that "420" is very common (1/16 chance per hex char roughly,
    // actually it's 3 chars, so 1/4096 probability to start at specific pos, but anywhere in string is high prob).
    // Let's just try a few hundred iterations.

    // We need to replicate the hashing logic: Keccak256(fragmentData + completionText)
    // We can use ethers.js or similar if available, or just brute force with RPC calls (too slow).
    // Better to use a local hash function.
    // Since I can't easily add npm packages here without user permission,
    // I will try to use a known working input or a very simple loop that calls a helper if I had one.
    // Wait, 'anchor' might have utils.

    // anchor.utils.sha256 is available, but we need keccak256.
    // anchor.web3.keccak is available!

    console.log("Mining for pattern:", target);

    while (!found) {
      const tryText = "mining" + i;
      const combined = fragmentData + tryText;
      const hashHex = keccak256(combined);

      if (hashHex.includes(target)) {
        completionText = tryText;
        found = true;
        console.log(`Found valid completion: "${completionText}" -> Hash: ${hashHex}`);
      }
      i++;
      if (i > 10000) {
        throw new Error("Could not find hash in 10000 tries");
      }
    }

    // Derive PDAs for resonance and user_score
    const [resonance] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("resonance"), kernelSeed.publicKey.toBuffer()],
      program.programId
    );

    const [userScore] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("score"), user.publicKey.toBuffer()],
      program.programId
    );

    // Get user token account
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      (user as any).payer,
      mint,
      user.publicKey
    );

    await program.methods
      .bridgeGap(completionText, salt)
      .accounts({
        user: user.publicKey,
        kernelSeed: kernelSeed.publicKey,
        mint: mint,
        userTokenAccount: userTokenAccount.address,
        mintAuthority: mintAuthorityPDA,
        resonance: resonance,
        userScore: userScore,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Gap bridged");

    // Verify balance
    const accountInfo = await getAccount(provider.connection, userTokenAccount.address);
    console.log("User balance:", accountInfo.amount.toString());

    // Expected reward for "65" is 650 * 10^9
    if (accountInfo.amount.toString() !== "650000000000") {
      throw new Error("Incorrect balance minted");
    }
    // Expected reward for "65" is 650 * 10^9
    if (accountInfo.amount.toString() !== "650000000000") {
      throw new Error("Incorrect balance minted");
    }

    // Monitor Resonance Metadata
    const resonanceAccount = await program.account.resonanceMetadata.fetch(resonance);
    console.log("Resonance Metadata:");
    console.log("  Total Gaps Bridged:", resonanceAccount.totalGapsBridged.toString());
    console.log("  Semantic Diversity:", resonanceAccount.semanticDiversity.toString());
    console.log("  Kernel Strain:", resonanceAccount.kernelStrain.toString());
  });

  it("Creates Metadata", async () => {
    const user = provider.wallet;

    // We need the mint address from the previous test, but since tests run independently or sequentially
    // without shared state usually, we might need to recreate it or assume it runs after.
    // However, 'it' blocks share the 'program' instance but not local variables unless defined outside.
    // Let's just create a new mint and metadata for this test to be self-contained.

    const [mintAuthorityPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("mint_authority")],
      program.programId
    );

    const mint = await createMint(
      provider.connection,
      (user as any).payer,
      mintAuthorityPDA,
      null,
      9
    );
    console.log("Mint created for metadata:", mint.toBase58());

    const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    const [metadataAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    await program.methods
      .createMetadata("MEMEk", "MEME", "https://example.com/memek.json")
      .accounts({
        mint: mint,
        mintAuthority: mintAuthorityPDA,
        metadata: metadataAddress,
        payer: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("Metadata created at:", metadataAddress.toBase58());
  });

  it("Triggers Evolution (Glitch)", async () => {
    const user = provider.wallet;
    // We need the kernelSeed and evolutionState from the first test.
    // Since we didn't save them globally, let's create new ones for this test
    // or just use the ones if we can access them. 
    // Actually, for a clean test, let's init a new kernel and then glitch it.

    const kernelSeed = anchor.web3.Keypair.generate();
    const evolutionState = anchor.web3.Keypair.generate();

    const seedId = new anchor.BN(2);
    const difficulty = 0;
    const fragmentData = "Static";

    await program.methods
      .initializeKernel(seedId, difficulty, fragmentData)
      .accounts({
        kernelSeed: kernelSeed.publicKey,
        evolutionState: evolutionState.publicKey,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([kernelSeed, evolutionState])
      .rpc();

    console.log("Kernel initialized for glitch");

    // Check initial state
    let seedAccount = await program.account.kernelSeed.fetch(kernelSeed.publicKey);
    console.log("Initial Difficulty:", seedAccount.difficulty);
    console.log("Initial Fragment:", seedAccount.fragmentData);

    if (seedAccount.difficulty !== 0) throw new Error("Initial difficulty should be 0");

    // Trigger Evolution
    await program.methods
      .triggerEvolution()
      .accounts({
        evolutionState: evolutionState.publicKey,
        kernelSeed: kernelSeed.publicKey,
        user: user.publicKey,
      })
      .rpc();

    console.log("Evolution triggered");

    // Verify Glitch
    seedAccount = await program.account.kernelSeed.fetch(kernelSeed.publicKey);
    console.log("Glitched Difficulty:", seedAccount.difficulty);
    console.log("Glitched Fragment:", seedAccount.fragmentData);

    if (seedAccount.difficulty !== 1) throw new Error("Difficulty did not toggle");
    if (!seedAccount.fragmentData.endsWith("...")) throw new Error("Fragment did not mutate");
  });

  it("Requests Fragment (Mycelium Interface)", async () => {
    const user = provider.wallet;
    // Use the glitched kernel seed from previous test or create new one.
    // Let's create a new one to be deterministic.
    const kernelSeed = anchor.web3.Keypair.generate();
    const seedId = new anchor.BN(3);
    const difficulty = 0;
    const fragmentData = "MyceliumFragment";

    // Need to initialize it first
    const evolutionState = anchor.web3.Keypair.generate(); // Just to satisfy init constraints

    await program.methods
      .initializeKernel(seedId, difficulty, fragmentData)
      .accounts({
        kernelSeed: kernelSeed.publicKey,
        evolutionState: evolutionState.publicKey,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([kernelSeed, evolutionState])
      .rpc();

    // Request Fragment
    // Since we can't easily capture return data in a simple RPC call without simulation or logs,
    // we will rely on the transaction succeeding and the logs showing the fragment.
    // In a real CPI scenario, the calling program would get the return data.

    const tx = await program.methods
      .requestFragment()
      .accounts({
        kernelSeed: kernelSeed.publicKey,
      })
      .rpc();

    console.log("Request Fragment Tx:", tx);

    // Wait for confirmation
    const latestBlockHash = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature: tx,
    });

    // We can fetch the transaction logs to verify
    const txDetails = await provider.connection.getTransaction(tx, { commitment: "confirmed" });
    const logs = txDetails?.meta?.logMessages;
    const expectedLog = `Fragment requested: ${fragmentData}`;

    if (!logs || !logs.some(log => log.includes(expectedLog))) {
      console.log("Logs:", logs);
      throw new Error("Fragment request log not found");
    }
    console.log("Fragment request verified via logs");
  });
});
