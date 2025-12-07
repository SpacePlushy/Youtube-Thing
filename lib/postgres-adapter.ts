/**
 * Custom PostgreSQL adapter for NextAuth.js
 * Works with Vercel Postgres (@vercel/postgres)
 */

import { sql } from '@vercel/postgres';
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession, VerificationToken } from 'next-auth/adapters';

export function PostgresAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, 'id'>) {
      const result = await sql`
        INSERT INTO users (email, name, image, email_verified)
        VALUES (${user.email}, ${user.name || null}, ${user.image || null}, ${user.emailVerified?.toISOString() || null})
        RETURNING id, email, name, image, email_verified as "emailVerified"
      `;

      const newUser = result.rows[0];
      return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        image: newUser.image,
        emailVerified: newUser.emailVerified ? new Date(newUser.emailVerified) : null,
      } as AdapterUser;
    },

    async getUser(id) {
      const result = await sql`
        SELECT id, email, name, image, email_verified as "emailVerified"
        FROM users WHERE id = ${id}
      `;

      if (!result.rows[0]) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } as AdapterUser;
    },

    async getUserByEmail(email) {
      const result = await sql`
        SELECT id, email, name, image, email_verified as "emailVerified"
        FROM users WHERE email = ${email}
      `;

      if (!result.rows[0]) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } as AdapterUser;
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const result = await sql`
        SELECT u.id, u.email, u.name, u.image, u.email_verified as "emailVerified"
        FROM users u
        INNER JOIN accounts a ON u.id = a.user_id
        WHERE a.provider = ${provider} AND a.provider_account_id = ${providerAccountId}
      `;

      if (!result.rows[0]) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified ? new Date(user.emailVerified) : null,
      } as AdapterUser;
    },

    async updateUser(user) {
      const result = await sql`
        UPDATE users
        SET
          name = COALESCE(${user.name || null}, name),
          image = COALESCE(${user.image || null}, image),
          email_verified = COALESCE(${user.emailVerified?.toISOString() || null}, email_verified),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${user.id}
        RETURNING id, email, name, image, email_verified as "emailVerified"
      `;

      const updatedUser = result.rows[0];
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
        emailVerified: updatedUser.emailVerified ? new Date(updatedUser.emailVerified) : null,
      } as AdapterUser;
    },

    async deleteUser(userId) {
      await sql`DELETE FROM users WHERE id = ${userId}`;
    },

    async linkAccount(account: AdapterAccount) {
      await sql`
        INSERT INTO accounts (
          user_id, type, provider, provider_account_id,
          refresh_token, access_token, expires_at,
          token_type, scope, id_token, session_state
        ) VALUES (
          ${account.userId}, ${account.type}, ${account.provider}, ${account.providerAccountId},
          ${account.refresh_token || null}, ${account.access_token || null}, ${account.expires_at || null},
          ${account.token_type || null}, ${account.scope || null}, ${account.id_token || null}, ${account.session_state || null}
        )
      `;

      return account as AdapterAccount;
    },

    async unlinkAccount({ providerAccountId, provider }: { providerAccountId: string; provider: string }) {
      await sql`
        DELETE FROM accounts
        WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}
      `;
    },

    async createSession(session) {
      await sql`
        INSERT INTO sessions (session_token, user_id, expires)
        VALUES (${session.sessionToken}, ${session.userId}, ${session.expires.toISOString()})
      `;

      return session as AdapterSession;
    },

    async getSessionAndUser(sessionToken) {
      const result = await sql`
        SELECT
          s.session_token as "sessionToken",
          s.user_id as "userId",
          s.expires,
          u.id, u.email, u.name, u.image, u.email_verified as "emailVerified"
        FROM sessions s
        INNER JOIN users u ON s.user_id = u.id
        WHERE s.session_token = ${sessionToken}
      `;

      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        session: {
          sessionToken: row.sessionToken,
          userId: row.userId,
          expires: new Date(row.expires),
        } as AdapterSession,
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          image: row.image,
          emailVerified: row.emailVerified ? new Date(row.emailVerified) : null,
        } as AdapterUser,
      };
    },

    async updateSession(session) {
      const result = await sql`
        UPDATE sessions
        SET expires = ${session.expires?.toISOString() || null}
        WHERE session_token = ${session.sessionToken}
        RETURNING session_token as "sessionToken", user_id as "userId", expires
      `;

      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        sessionToken: row.sessionToken,
        userId: row.userId,
        expires: new Date(row.expires),
      } as AdapterSession;
    },

    async deleteSession(sessionToken) {
      await sql`DELETE FROM sessions WHERE session_token = ${sessionToken}`;
    },

    async createVerificationToken(token) {
      await sql`
        INSERT INTO verification_tokens (identifier, token, expires)
        VALUES (${token.identifier}, ${token.token}, ${token.expires.toISOString()})
      `;

      return token as VerificationToken;
    },

    async useVerificationToken({ identifier, token }) {
      const result = await sql`
        DELETE FROM verification_tokens
        WHERE identifier = ${identifier} AND token = ${token}
        RETURNING identifier, token, expires
      `;

      if (!result.rows[0]) return null;

      const row = result.rows[0];
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      } as VerificationToken;
    },
  };
}
