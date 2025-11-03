/**
 * Tests for transcript extraction API with authentication and usage tracking
 * Task Group 7.1: 2-6 focused tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
}));

vi.mock('@/lib/usage-tracker', () => ({
  checkUsageLimit: vi.fn(),
  incrementUsage: vi.fn(),
}));

vi.mock('@/lib/clerk-helpers', () => ({
  canAccessHistory: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  saveTranscript: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { checkUsageLimit, incrementUsage } from '@/lib/usage-tracker';
import { canAccessHistory } from '@/lib/clerk-helpers';
import { saveTranscript } from '@/lib/db';
import { POST } from '@/app/api/transcript/extract/route';
import { NextRequest } from 'next/server';

describe('POST /api/transcript/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if user is not authenticated', async () => {
    // Mock unauthenticated user
    (auth as any).mockResolvedValue({ userId: null });

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(data.details).toContain('sign in');
  });

  it('should return 429 when usage limit is exceeded (Free tier at 5/5)', async () => {
    // Mock authenticated user
    (auth as any).mockResolvedValue({ userId: 'user_123' });

    // Mock usage limit exceeded
    (checkUsageLimit as any).mockResolvedValue({
      currentUsage: 5,
      dailyLimit: 5,
      tier: 'free',
      resetTime: '2025-11-03T00:00:00Z',
      canProceed: false,
    });

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('USAGE_LIMIT_EXCEEDED');
    expect(data.usage.currentUsage).toBe(5);
    expect(data.usage.dailyLimit).toBe(5);
    expect(data.usage.tier).toBe('free');
  });

  it('should successfully extract transcript and increment usage counter for authenticated user', async () => {
    // Mock authenticated user
    (auth as any).mockResolvedValue({ userId: 'user_123' });

    // Mock usage stats (within limit)
    (checkUsageLimit as any).mockResolvedValue({
      currentUsage: 2,
      dailyLimit: 5,
      tier: 'free',
      resetTime: '2025-11-03T00:00:00Z',
      canProceed: true,
    });

    // Mock successful transcript fetch
    (YoutubeTranscript.fetchTranscript as any).mockResolvedValue([
      { text: 'Hello world', offset: 0, duration: 2000 },
      { text: 'This is a test', offset: 2000, duration: 3000 },
    ]);

    // Mock history access (Free tier - no access)
    (canAccessHistory as any).mockResolvedValue(false);

    // Mock increment usage
    (incrementUsage as any).mockResolvedValue(3);

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toHaveLength(2);
    expect(data.transcript[0].text).toBe('Hello world');
    expect(data.usage).toBeDefined();
    expect(data.usage.tier).toBe('free');
    expect(incrementUsage).toHaveBeenCalledWith('user_123');
  });

  it('should save transcript to history for Starter+ tiers when saveToHistory is true', async () => {
    // Mock authenticated user
    (auth as any).mockResolvedValue({ userId: 'user_starter' });

    // Mock usage stats (Starter tier)
    (checkUsageLimit as any).mockResolvedValue({
      currentUsage: 10,
      dailyLimit: 50,
      tier: 'starter',
      resetTime: '2025-11-03T00:00:00Z',
      canProceed: true,
    });

    // Mock successful transcript fetch
    (YoutubeTranscript.fetchTranscript as any).mockResolvedValue([
      { text: 'Starter tier transcript', offset: 0, duration: 2000 },
    ]);

    // Mock history access (Starter tier - has access)
    (canAccessHistory as any).mockResolvedValue(true);

    // Mock save transcript
    (saveTranscript as any).mockResolvedValue('transcript_uuid_123');

    // Mock increment usage
    (incrementUsage as any).mockResolvedValue(11);

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({ videoId: 'dQw4w9WgXcQ', saveToHistory: true }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toHaveLength(1);
    expect(saveTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_starter',
        videoId: 'dQw4w9WgXcQ',
        transcriptText: expect.any(String),
      })
    );
  });

  it('should return 400 if no video ID or URL is provided', async () => {
    // Mock authenticated user
    (auth as any).mockResolvedValue({ userId: 'user_123' });

    // Mock usage stats (within limit)
    (checkUsageLimit as any).mockResolvedValue({
      currentUsage: 2,
      dailyLimit: 5,
      tier: 'free',
      resetTime: '2025-11-03T00:00:00Z',
      canProceed: true,
    });

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Bad Request');
    expect(data.details).toContain('Video ID or URL is required');
  });

  it('should handle YouTube URL format and extract video ID', async () => {
    // Mock authenticated user
    (auth as any).mockResolvedValue({ userId: 'user_123' });

    // Mock usage stats (within limit)
    (checkUsageLimit as any).mockResolvedValue({
      currentUsage: 1,
      dailyLimit: 5,
      tier: 'free',
      resetTime: '2025-11-03T00:00:00Z',
      canProceed: true,
    });

    // Mock successful transcript fetch
    (YoutubeTranscript.fetchTranscript as any).mockResolvedValue([
      { text: 'URL test', offset: 0, duration: 1000 },
    ]);

    // Mock history access
    (canAccessHistory as any).mockResolvedValue(false);

    // Mock increment usage
    (incrementUsage as any).mockResolvedValue(2);

    const request = new NextRequest('http://localhost:3000/api/transcript/extract', {
      method: 'POST',
      body: JSON.stringify({ videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.transcript).toHaveLength(1);
    expect(YoutubeTranscript.fetchTranscript).toHaveBeenCalledWith('dQw4w9WgXcQ');
  });
});
