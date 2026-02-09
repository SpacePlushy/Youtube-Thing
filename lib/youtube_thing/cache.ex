defmodule YoutubeThing.Cache do
  @moduledoc """
  Caching layer for transcript data using Cachex.

  Caches fetched transcripts by video ID to avoid redundant API calls.
  Default TTL is 1 hour.
  """

  @cache_name :youtube_thing_cache
  @default_ttl :timer.hours(1)

  @doc """
  Get a cached transcript by video ID.
  """
  @spec get_transcript(String.t()) :: {:ok, map()} | {:ok, nil}
  def get_transcript(video_id) do
    Cachex.get(@cache_name, "transcript:#{video_id}")
  end

  @doc """
  Cache a transcript result for a video ID.
  """
  @spec put_transcript(String.t(), map(), keyword()) :: {:ok, boolean()}
  def put_transcript(video_id, result, opts \\ []) do
    ttl = Keyword.get(opts, :ttl, @default_ttl)
    Cachex.put(@cache_name, "transcript:#{video_id}", result, expire: ttl)
  end

  @doc """
  Fetch a transcript from cache, or compute and cache it using the given function.
  """
  @spec fetch_transcript(String.t(), (-> {:ok, map()} | {:error, term()})) ::
          {:ok, map()} | {:error, term()}
  def fetch_transcript(video_id, fetch_fn) do
    key = "transcript:#{video_id}"

    case Cachex.get(@cache_name, key) do
      {:ok, nil} ->
        case fetch_fn.() do
          {:ok, result} ->
            Cachex.put(@cache_name, key, result, expire: @default_ttl)
            {:ok, result}

          error ->
            error
        end

      {:ok, cached} ->
        {:ok, cached}
    end
  end

  @doc """
  Remove a cached transcript.
  """
  @spec invalidate_transcript(String.t()) :: {:ok, boolean()}
  def invalidate_transcript(video_id) do
    Cachex.del(@cache_name, "transcript:#{video_id}")
  end

  @doc """
  Clear all cached transcripts.
  """
  @spec clear_all() :: {:ok, integer()}
  def clear_all do
    Cachex.clear(@cache_name)
  end
end
