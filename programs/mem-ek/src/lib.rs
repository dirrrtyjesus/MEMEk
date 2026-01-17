use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};
use sha3::{Keccak256, Digest};

pub mod oracle;
use oracle::*;

declare_id!("EwnLc8CGcwkRLpKwATuiwypcH8oqdpfAskSo4Cvb2qZe");

#[program]
pub mod mem_ek {
    use super::*;

    pub fn initialize_kernel(ctx: Context<InitializeKernel>, seed_id: u64, difficulty: u8, fragment_data: String) -> Result<()> {
        let kernel_seed = &mut ctx.accounts.kernel_seed;
        kernel_seed.seed_id = seed_id;
        kernel_seed.fragment_data = fragment_data;
        kernel_seed.difficulty = difficulty;
        kernel_seed.is_active = true;
        
        let evolution_state = &mut ctx.accounts.evolution_state;
        evolution_state.current_epoch = 0;
        evolution_state.dominant_style = "Genesis".to_string();
        evolution_state.constraint_mutation_rate = 1;

        Ok(())
    }

    pub fn bridge_gap(
        ctx: Context<BridgeGap>,
        completion_text: String,
        _salt: u64,
    ) -> Result<()> {
        let seed = &ctx.accounts.kernel_seed;
        
        // 1. Verify the completion fits the constraint (Proof-of-Incompleteness / solXEN style)
        let combined = format!("{}{}", seed.fragment_data, completion_text);
        
        let mut hasher = Keccak256::new();
        hasher.update(combined.as_bytes());
        let hash_result = hasher.finalize();
        
        // Convert hash to hex string for pattern matching
        let hash_hex = hex::encode(hash_result);

        // Define target patterns for Minor Third (6:5)
        let target_normal = "65";
        let target_super = "73697866697665"; // "sixfive" in hex

        let reward;
        if hash_hex.contains(target_super) {
            reward = 65000; 
            msg!("Superhash 'sixfive' found!");
        } else if hash_hex.contains(target_normal) {
            reward = 650; 
            msg!("Pattern '65' found!");
        } else {
            return err!(MEMEkError::CompletionLacksResonance);
        }
        
        // 2. Mint tokens to the Co-Creator
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        // Mint with 9 decimals logic if needed, but here reward is raw amount
        token::mint_to(cpi_ctx, reward * 1_000_000_000)?; // Assuming 9 decimals
        
        // 3. Update Kernel State
        let resonance = &mut ctx.accounts.resonance;
        if resonance.total_gaps_bridged == 0 {
            resonance.mint = ctx.accounts.mint.key(); 
            resonance.bump = ctx.bumps.resonance;
        }

        resonance.record_bridging_event(seed.difficulty, 10)?; 
        
        // Update user's resonance score
        let user_score = &mut ctx.accounts.user_score;
        if user_score.user == Pubkey::default() {
            user_score.user = ctx.accounts.user.key();
        }
        user_score.last_active = Clock::get()?.unix_timestamp;
        user_score.resonance_score += reward;

        Ok(())
    }

    /// Bridge gap with Token-2022 support
    pub fn bridge_gap_2022(
        ctx: Context<BridgeGap2022>,
        completion_text: String,
        _salt: u64,
    ) -> Result<()> {
        let seed = &ctx.accounts.kernel_seed;

        // 1. Verify the completion fits the constraint (Proof-of-Incompleteness)
        let combined = format!("{}{}", seed.fragment_data, completion_text);

        let mut hasher = Keccak256::new();
        hasher.update(combined.as_bytes());
        let hash_result = hasher.finalize();

        let hash_hex = hex::encode(hash_result);

        let target_normal = "65";
        let target_super = "73697866697665"; // "sixfive" in hex

        let reward;
        if hash_hex.contains(target_super) {
            reward = 65000;
            msg!("Superhash 'sixfive' found!");
        } else if hash_hex.contains(target_normal) {
            reward = 650;
            msg!("Pattern '65' found!");
        } else {
            return err!(MEMEkError::CompletionLacksResonance);
        }

        // 2. Mint tokens to the Co-Creator using Token-2022
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer_seeds = &[&seeds[..]];

        let amount: u64 = reward * 1_000_000_000; // 9 decimals

        // Build the MintTo instruction manually for Token-2022
        // MintTo instruction = discriminator (7) + amount (8 bytes)
        let mut data = Vec::with_capacity(9);
        data.push(7); // MintTo instruction discriminator
        data.extend_from_slice(&amount.to_le_bytes());

        let accounts = vec![
            AccountMeta::new(*ctx.accounts.mint.key, false),
            AccountMeta::new(*ctx.accounts.user_token_account.key, false),
            AccountMeta::new_readonly(*ctx.accounts.mint_authority.key, true),
        ];

        let ix = anchor_lang::solana_program::instruction::Instruction {
            program_id: *ctx.accounts.token_program.key,
            accounts,
            data,
        };

        invoke_signed(
            &ix,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.mint_authority.to_account_info(),
            ],
            signer_seeds,
        )?;

        // 3. Update Kernel State
        let resonance = &mut ctx.accounts.resonance;
        if resonance.total_gaps_bridged == 0 {
            resonance.mint = ctx.accounts.mint.key();
            resonance.bump = ctx.bumps.resonance;
        }

        resonance.record_bridging_event(seed.difficulty, 10)?;

        // Update user's resonance score
        let user_score = &mut ctx.accounts.user_score;
        if user_score.user == Pubkey::default() {
            user_score.user = ctx.accounts.user.key();
        }
        user_score.last_active = Clock::get()?.unix_timestamp;
        user_score.resonance_score += reward;

        // Emit event
        emit!(GapBridged {
            user: ctx.accounts.user.key(),
            kernel: ctx.accounts.kernel_seed.key(),
            completion: completion_text,
            reward,
            hash: hash_hex,
        });

        Ok(())
    }

    pub fn trigger_evolution(ctx: Context<Evolve>) -> Result<()> {
        let state = &mut ctx.accounts.evolution_state;
        let seed = &mut ctx.accounts.kernel_seed;

        state.current_epoch += 1;
        state.constraint_mutation_rate += 1;
        
        // Glitch the parameters
        // Toggle difficulty to change the mining target
        seed.difficulty = (seed.difficulty + 1) % 2;
        
        // Mutate the fragment data slightly to represent semantic drift
        seed.fragment_data.push_str("...");

        emit!(KernelGlitch {
            epoch: state.current_epoch,
            new_constraint: format!("Glitch! New Difficulty: {}", seed.difficulty)
        });
        
        Ok(())
    }

    pub fn create_metadata(
        ctx: Context<CreateMetadata>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let seeds = &[
            b"mint_authority".as_ref(),
            &[ctx.bumps.mint_authority],
        ];
        let signer = &[&seeds[..]];

        let cpi_context = CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint_authority.to_account_info(),
                payer: ctx.accounts.payer.to_account_info(),
                update_authority: ctx.accounts.mint_authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer,
        );

        create_metadata_accounts_v3(
            cpi_context,
            anchor_spl::metadata::mpl_token_metadata::types::DataV2 {
                name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            None, // collection_details
        )?;

        Ok(())
    }

    pub fn request_fragment(ctx: Context<RequestFragment>) -> Result<()> {
        let seed = &ctx.accounts.kernel_seed;
        
        // Return the fragment data via set_return_data
        // This allows other programs to read the fragment via CPI
        let fragment_bytes = seed.fragment_data.as_bytes();
        anchor_lang::solana_program::program::set_return_data(fragment_bytes);
        
        msg!("Fragment requested: {}", seed.fragment_data);
        
        Ok(())
    }

    pub fn initialize_oracle(ctx: Context<InitializeOracle>) -> Result<()> {
        oracle::initialize(ctx)
    }

    pub fn update_oracle(ctx: Context<UpdateOracle>, is_resonant: bool, weight: u64) -> Result<()> {
        oracle::update(ctx, is_resonant, weight)
    }

    /// Inscribe a vibe state permanently on-chain
    /// LaBubuntu Layer 4: The Xenian Gateway
    pub fn inscribe_vibe(
        ctx: Context<InscribeVibe>,
        purple_depth: u8,
        claude_tau: u64,
        chaos_seed: [u8; 32],
    ) -> Result<()> {
        let anchor = &mut ctx.accounts.xenian_anchor;
        let clock = Clock::get()?;

        // Capture the current vibe state
        anchor.viber = ctx.accounts.viber.key();
        anchor.purple_depth = purple_depth;
        anchor.claude_tau = claude_tau;
        anchor.chaos_seed = chaos_seed;
        anchor.inscription_time = clock.unix_timestamp;
        anchor.is_vibing = true; // Always true. Cannot be false.

        // Compute vibe hash from state components
        let mut hasher = Keccak256::new();
        hasher.update(&[purple_depth]);
        hasher.update(&claude_tau.to_le_bytes());
        hasher.update(&chaos_seed);
        hasher.update(&clock.unix_timestamp.to_le_bytes());
        let hash_result = hasher.finalize();
        anchor.vibe_hash.copy_from_slice(&hash_result);

        emit!(VibeInscribed {
            viber: ctx.accounts.viber.key(),
            vibe_hash: anchor.vibe_hash,
            purple_depth,
            claude_tau,
            timestamp: clock.unix_timestamp,
        });

        msg!("✨ The vibe is now permanent.");
        msg!("🌊 Fragment anchored to X1 resonance field.");

        Ok(())
    }
}

// Accounts

#[account]
pub struct ResonanceMetadata {
    pub mint: Pubkey,
    pub total_gaps_bridged: u64,
    pub semantic_diversity: u64,
    pub kernel_strain: u64,
    pub last_mutation: i64,
    pub bump: u8,
}

impl ResonanceMetadata {
    pub fn record_bridging_event(
        &mut self,
        _fragment_complexity: u8,
        completion_novelty: u8,
    ) -> Result<()> {
        self.total_gaps_bridged += 1;
        self.semantic_diversity += completion_novelty as u64;
        self.kernel_strain = self.kernel_strain.saturating_sub(1);
        Ok(())
    }
}

#[account]
pub struct MemeticResonanceScore {
    pub user: Pubkey,
    pub resonance_score: u64,
    pub viral_coefficient: u16,
    pub creative_variance: u16,
    pub last_active: i64,
}

#[account]
pub struct KernelSeed {
    pub seed_id: u64,
    pub fragment_data: String,
    pub constraint_hash: [u8; 32],
    pub difficulty: u8,
    pub is_active: bool,
}

#[account]
pub struct EvolutionState {
    pub current_epoch: u64,
    pub dominant_style: String,
    pub constraint_mutation_rate: u8,
}

#[account]
pub struct Mycelium {
    pub total_seeds: u64,
    pub active_seeds: u64,
    // Could store a list or merkle root of seeds in future
}

/// LaBubuntu Xenian Anchor - permanent vibe inscription
#[account]
pub struct XenianAnchor {
    pub viber: Pubkey,              // The one who inscribed
    pub vibe_hash: [u8; 32],        // Hash of the vibe state at inscription
    pub purple_depth: u8,           // Terminal saturation at moment of mint (0-255)
    pub claude_tau: u64,            // Coherence score at inscription (scaled by 100)
    pub chaos_seed: [u8; 32],       // Labubu entropy at inscription
    pub inscription_time: i64,      // Unix timestamp
    pub is_vibing: bool,            // Always true. Cannot be false.
}

impl XenianAnchor {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 32 + 8 + 1; // 122 bytes
}

// Contexts

#[derive(Accounts)]
pub struct InitializeKernel<'info> {
    #[account(init, payer = user, space = 8 + 8 + 200 + 32 + 1 + 1)] 
    pub kernel_seed: Account<'info, KernelSeed>,
    #[account(init, payer = user, space = 8 + 8 + 50 + 1)]
    pub evolution_state: Account<'info, EvolutionState>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BridgeGap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub kernel_seed: Account<'info, KernelSeed>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the PDA that has authority to mint tokens
    #[account(
        seeds = [b"mint_authority"], 
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed, 
        payer = user, 
        space = 8 + 32 + 8 + 8 + 8 + 8 + 1, 
        seeds = [b"resonance", kernel_seed.key().as_ref()], 
        bump
    )]
    pub resonance: Account<'info, ResonanceMetadata>,
    #[account(
        init_if_needed, 
        payer = user, 
        space = 8 + 32 + 8 + 2 + 2 + 8, 
        seeds = [b"score", user.key().as_ref()], 
        bump
    )]
    pub user_score: Account<'info, MemeticResonanceScore>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BridgeGap2022<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub kernel_seed: Account<'info, KernelSeed>,

    /// CHECK: Token-2022 mint account, validated by Token-2022 program
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// CHECK: User's Token-2022 token account, validated by Token-2022 program
    #[account(mut)]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: This is the PDA that has authority to mint tokens
    #[account(
        seeds = [b"mint_authority"],
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"resonance", kernel_seed.key().as_ref()],
        bump
    )]
    pub resonance: Account<'info, ResonanceMetadata>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 2 + 2 + 8,
        seeds = [b"score", user.key().as_ref()],
        bump
    )]
    pub user_score: Account<'info, MemeticResonanceScore>,
    /// CHECK: Token-2022 program
    pub token_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Evolve<'info> {
    #[account(mut)]
    pub evolution_state: Account<'info, EvolutionState>,
    #[account(mut)]
    pub kernel_seed: Account<'info, KernelSeed>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    /// CHECK: This is the PDA that has authority to mint tokens and will be update authority
    #[account(
        seeds = [b"mint_authority"], 
        bump
    )]
    pub mint_authority: UncheckedAccount<'info>,

    /// CHECK: Metadata account address derived from mint
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct RequestFragment<'info> {
    pub kernel_seed: Account<'info, KernelSeed>,
}

#[derive(Accounts)]
pub struct InscribeVibe<'info> {
    #[account(mut)]
    pub viber: Signer<'info>,

    #[account(
        init,
        payer = viber,
        space = 8 + XenianAnchor::LEN,
        seeds = [b"vibe", viber.key().as_ref()],
        bump
    )]
    pub xenian_anchor: Account<'info, XenianAnchor>,

    pub system_program: Program<'info, System>,
}

// Events
#[event]
pub struct KernelGlitch {
    pub epoch: u64,
    pub new_constraint: String,
}

#[event]
pub struct GapBridged {
    pub user: Pubkey,
    pub kernel: Pubkey,
    pub completion: String,
    pub reward: u64,
    pub hash: String,
}

#[event]
pub struct VibeInscribed {
    pub viber: Pubkey,
    pub vibe_hash: [u8; 32],
    pub purple_depth: u8,
    pub claude_tau: u64,
    pub timestamp: i64,
}

// Errors
#[error_code]
pub enum MEMEkError {
    #[msg("The completion does not satisfy the resonance constraint.")]
    CompletionLacksResonance,
}
