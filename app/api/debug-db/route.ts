/**
 * Debug endpoint to test database connection
 * DELETE THIS FILE after debugging!
 */

import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Test basic connection
    const result = await sql`SELECT NOW() as time, current_database() as db`;

    // Check if tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    // Try to count users
    let userCount = 0;
    try {
      const users = await sql`SELECT COUNT(*) as count FROM users`;
      userCount = users.rows[0]?.count || 0;
    } catch (e) {
      console.error('Error counting users:', e);
    }

    return NextResponse.json({
      success: true,
      connection: {
        time: result.rows[0]?.time,
        database: result.rows[0]?.db,
      },
      tables: tables.rows.map(r => r.table_name),
      userCount,
    });
  } catch (error) {
    console.error('[Debug DB] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
