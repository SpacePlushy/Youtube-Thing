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
 * Initialize database schema
 * Creates tables if they don't exist
 */
export async function initializeDatabase(): Promise<void> {
  if (!await isDatabaseAvailable()) {
    console.warn('[Database] Skipping database initialization - not available');
    return;
  }

  try {
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
    const orderClause = `${sortBy} ${order.toUpperCase()}`;

    // Get transcripts (without full text for performance)
    const transcriptsResult = await sql`
      SELECT
        id,
        video_id,
        video_title,
        channel_name,
        video_duration,
        created_at
      FROM users_transcripts
      WHERE user_id = ${userId}
      ORDER BY ${sql.unsafe(orderClause) as any}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

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
 * Starter tier: 30 days, Pro/Enterprise: unlimited
 */
export async function cleanupOldTranscripts(userId: string, tier: 'starter' | 'pro' | 'enterprise'): Promise<void> {
  if (!await isDatabaseAvailable()) {
    return;
  }

  // Only Starter tier has retention limits
  if (tier !== 'starter') {
    return;
  }

  try {
    await sql`
      DELETE FROM users_transcripts
      WHERE user_id = ${userId}
        AND created_at < NOW() - INTERVAL '30 days'
    `;

    console.log(`[Database] Cleaned up old transcripts for user ${userId}`);
  } catch (error) {
    console.error('[Database] Error cleaning up old transcripts:', error);
  }
}
