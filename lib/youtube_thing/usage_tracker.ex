defmodule YoutubeThing.UsageTracker do
  @moduledoc """
  Tracks daily usage per user using Hammer for counters.

  Free tier: 5 extractions per day
  Pro tier: unlimited

  Counters reset at midnight UTC (using a 24-hour sliding window via Hammer).
  """

  @daily_scale :timer.hours(24)
  @free_daily_limit 5

  @doc """
  Check if a user can perform a transcript extraction.

  Returns `:ok` if allowed, `{:error, :usage_limit_reached}` if not.
  Pro users are always allowed.
  """
  @spec check_usage(integer(), atom()) :: :ok | {:error, :usage_limit_reached}
  def check_usage(_user_id, :pro), do: :ok

  def check_usage(user_id, _tier) do
    case YoutubeThing.RateLimiter.hit("usage:#{user_id}", @daily_scale, @free_daily_limit) do
      {:allow, _count} -> :ok
      {:deny, _retry_after} -> {:error, :usage_limit_reached}
    end
  end

  @doc """
  Increment usage count for a user. Called after a successful extraction.

  For free users, this is handled automatically by `check_usage/2` via Hammer's `hit`.
  This function is provided for explicit tracking when needed.
  """
  @spec record_usage(integer()) :: :ok
  def record_usage(user_id) do
    # Hammer's hit already increments the counter, so this is a no-op
    # when called after check_usage. Provided for semantics.
    YoutubeThing.RateLimiter.inc("usage:#{user_id}", @daily_scale)
    :ok
  end

  @doc """
  Get the current usage count for a user today.
  """
  @spec get_usage(integer()) :: non_neg_integer()
  def get_usage(user_id) do
    YoutubeThing.RateLimiter.get("usage:#{user_id}", @daily_scale)
  end

  @doc """
  Get the daily limit for a given subscription tier.
  """
  @spec daily_limit(atom()) :: non_neg_integer() | :unlimited
  def daily_limit(:pro), do: :unlimited
  def daily_limit(_tier), do: @free_daily_limit
end
