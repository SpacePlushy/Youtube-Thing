/**
 * Database client for Vercel Postgres
 * Following error handling patterns from lib/rate-limiter-upstash.ts
 */

import { sql } from '@vercel/postgres';

/**
 * Check if database is available
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (!process.env.POSTGRES_URL) {
    console.warn('[Database] Postgres configuration not found. Database operations disabled for development.');
    return false;
  }

  try {
    // Simple ping query
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Database] Failed to connect to Postgres:', error);
    return false;
  }
}

/**
 * Initialize NextAuth database tables
 * Required for authentication with database adapter
 */
export async function initAuthTables(): Promise<void> {
  if (!await isDatabaseAvailable()) {
    console.warn('[Database] Skipping auth tables initialization - not available');
    return;
  }

  try {
    // Create users table (NextAuth + subscription data)
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        image VARCHAR(500),
        email_verified TIMESTAMP WITH TIME ZONE,
        password_hash VARCHAR(255),
        stripe_customer_id VARCHAR(255) UNIQUE,
        subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
        subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('inactive', 'active', 'canceled', 'past_due')),
        subscription_id VARCHAR(255),
        subscription_period_end TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for users table
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe ON users (stripe_customer_id)`;

    // Create accounts table (OAuth providers)
    await sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        provider_account_id VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        token_type VARCHAR(255),
        scope VARCHAR(255),
        id_token TEXT,
        session_state VARCHAR(255),
        UNIQUE(provider, provider_account_id)
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts (user_id)`;

    // Create sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_token VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions (session_token)`;

    // Create verification tokens table (for email sign-in)
    await sql`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY (identifier, token)
      )
    `;

    console.log('[Database] Auth tables initialized successfully');
  } catch (error) {
    console.error('[Database] Error initializing auth tables:', error);
    throw error;
  }
}

/**
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  if (!await isDatabaseAvailable()) {
    console.warn('[Database] Skipping database initialization - not available');
    return;
  }

  try {
    // Initialize auth tables first
    await initAuthTables();

    // Create users_transcripts table
    await sql`
      CREATE TABLE IF NOT EXISTS users_transcripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        video_id VARCHAR(255) NOT NULL,
        video_title TEXT NOT NULL,
        channel_name VARCHAR(500),
        video_duration INTEGER,
        transcript_text TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_created
      ON users_transcripts (user_id, created_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_video
      ON users_transcripts (video_id)
    `;

    // Create user_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id VARCHAR(255) PRIMARY KEY,
        default_export_format VARCHAR(10) DEFAULT 'txt',
        email_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('[Database] Schema initialized successfully');
  } catch (error) {
    console.error('[Database] Error initializing schema:', error);
    throw error;
  }
}

/**
 * Save transcript to database
 */
export async function saveTranscript(data: {
  userId: string;
  videoId: string;
  videoTitle: string;
  channelName?: string;
  videoDuration?: number;
  transcriptText: string;
}): Promise<string | null> {
  if (!await isDatabaseAvailable()) {
    console.warn('[Database] Skipping transcript save - database not available');
    return null;
  }

  try {
    const result = await sql`
      INSERT INTO users_transcripts (
        user_id,
        video_id,
        video_title,
        channel_name,
        video_duration,
        transcript_text
      ) VALUES (
        ${data.userId},
        ${data.videoId},
        ${data.videoTitle},
        ${data.channelName || null},
        ${data.videoDuration || null},
        ${data.transcriptText}
      )
      RETURNING id
    `;

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('[Database] Error saving transcript:', error);
    return null;
  }
}

/**
 * Get user's transcript history (paginated)
 */
export async function getTranscriptHistory(
  userId: string,
  page: number = 1,
  limit: number = 20,
  sortBy: 'created_at' | 'video_title' = 'created_at',
  order: 'asc' | 'desc' = 'desc'
) {
  if (!await isDatabaseAvailable()) {
    return { transcripts: [], total: 0 };
  }

  try {
    const offset = (page - 1) * limit;

    // Get transcripts (without full text for performance)
    // Use separate queries for each sort option since we can't use dynamic ORDER BY safely
    let transcriptsResult;

    if (sortBy === 'video_title' && order === 'asc') {
      transcriptsResult = await sql`
        SELECT id, video_id, video_title, channel_name, video_duration, created_at
        FROM users_transcripts
        WHERE user_id = ${userId}
        ORDER BY video_title ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'video_title' && order === 'desc') {
      transcriptsResult = await sql`
        SELECT id, video_id, video_title, channel_name, video_duration, created_at
        FROM users_transcripts
        WHERE user_id = ${userId}
        ORDER BY video_title DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (sortBy === 'created_at' && order === 'asc') {
      transcriptsResult = await sql`
        SELECT id, video_id, video_title, channel_name, video_duration, created_at
        FROM users_transcripts
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // Default: created_at DESC
      transcriptsResult = await sql`
        SELECT id, video_id, video_title, channel_name, video_duration, created_at
        FROM users_transcripts
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM users_transcripts
      WHERE user_id = ${userId}
    `;

    return {
      transcripts: transcriptsResult.rows,
      total: parseInt(countResult.rows[0]?.total || '0', 10),
    };
  } catch (error) {
    console.error('[Database] Error getting transcript history:', error);
    return { transcripts: [], total: 0 };
  }
}

/**
 * Get single transcript by ID
 */
export async function getTranscriptById(id: string, userId: string) {
  if (!await isDatabaseAvailable()) {
    return null;
  }

  try {
    const result = await sql`
      SELECT
        id,
        video_id,
        video_title,
        channel_name,
        video_duration,
        transcript_text,
        created_at
      FROM users_transcripts
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `;

    return result.rows[0] || null;
  } catch (error) {
    console.error('[Database] Error getting transcript by ID:', error);
    return null;
  }
}

/**
 * Delete transcript by ID
 */
export async function deleteTranscript(id: string, userId: string): Promise<boolean> {
  if (!await isDatabaseAvailable()) {
    return false;
  }

  try {
    const result = await sql`
      DELETE FROM users_transcripts
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[Database] Error deleting transcript:', error);
    return false;
  }
}

/**
 * Clean up old transcripts based on retention policy
 * Pro tier has unlimited retention, free tier has no history access
 */
export async function cleanupOldTranscripts(userId: string, tier: 'free' | 'pro'): Promise<void> {
  if (!await isDatabaseAvailable()) {
    return;
  }

  // Pro tier has unlimited retention
  if (tier === 'pro') {
    return;
  }

  // Free tier doesn't have history access, but clean up any old entries just in case
  try {
    await sql`
      DELETE FROM users_transcripts
      WHERE user_id = ${userId}
        AND created_at < NOW() - INTERVAL '7 days'
    `;

    console.log(`[Database] Cleaned up old transcripts for user ${userId}`);
  } catch (error) {
    console.error('[Database] Error cleaning up old transcripts:', error);
  }
}

// ============================================
// User Management Functions (for NextAuth)
// ============================================

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
  if (!await isDatabaseAvailable()) {
    return null;
  }

  try {
    const result = await sql`
      SELECT id, email, name, image, email_verified,
             stripe_customer_id, subscription_tier, subscription_status,
             subscription_id, subscription_period_end, created_at, updated_at
      FROM users WHERE id = ${id}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('[Database] Error getting user by ID:', error);
    return null;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  if (!await isDatabaseAvailable()) {
    return null;
  }

  try {
    const result = await sql`
      SELECT id, email, name, image, email_verified, password_hash,
             stripe_customer_id, subscription_tier, subscription_status,
             subscription_id, subscription_period_end, created_at, updated_at
      FROM users WHERE email = ${email}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('[Database] Error getting user by email:', error);
    return null;
  }
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(stripeCustomerId: string) {
  if (!await isDatabaseAvailable()) {
    return null;
  }

  try {
    const result = await sql`
      SELECT id, email, name, image, subscription_tier, subscription_status,
             subscription_id, subscription_period_end
      FROM users WHERE stripe_customer_id = ${stripeCustomerId}
    `;
    return result.rows[0] || null;
  } catch (error) {
    console.error('[Database] Error getting user by Stripe ID:', error);
    return null;
  }
}

/**
 * Update user's Stripe customer ID
 */
export async function updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<boolean> {
  if (!await isDatabaseAvailable()) {
    return false;
  }

  try {
    await sql`
      UPDATE users
      SET stripe_customer_id = ${stripeCustomerId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;
    return true;
  } catch (error) {
    console.error('[Database] Error updating Stripe customer ID:', error);
    return false;
  }
}

/**
 * Update user's subscription status
 */
export async function updateUserSubscription(
  stripeCustomerId: string,
  data: {
    tier: 'free' | 'pro';
    status: 'inactive' | 'active' | 'canceled' | 'past_due';
    subscriptionId?: string | null;
    periodEnd?: Date | null;
  }
): Promise<boolean> {
  if (!await isDatabaseAvailable()) {
    return false;
  }

  try {
    await sql`
      UPDATE users
      SET
        subscription_tier = ${data.tier},
        subscription_status = ${data.status},
        subscription_id = ${data.subscriptionId || null},
        subscription_period_end = ${data.periodEnd?.toISOString() || null},
        updated_at = CURRENT_TIMESTAMP
      WHERE stripe_customer_id = ${stripeCustomerId}
    `;
    return true;
  } catch (error) {
    console.error('[Database] Error updating subscription:', error);
    return false;
  }
}

/**
 * Get user's subscription tier
 */
export async function getUserSubscriptionTier(userId: string): Promise<'free' | 'pro'> {
  if (!await isDatabaseAvailable()) {
    return 'free';
  }

  try {
    const result = await sql`
      SELECT subscription_tier, subscription_status
      FROM users WHERE id = ${userId}
    `;

    const user = result.rows[0];

    // Only return 'pro' if subscription is active
    if (user?.subscription_tier === 'pro' && user?.subscription_status === 'active') {
      return 'pro';
    }

    return 'free';
  } catch (error) {
    console.error('[Database] Error getting subscription tier:', error);
    return 'free';
  }
}
