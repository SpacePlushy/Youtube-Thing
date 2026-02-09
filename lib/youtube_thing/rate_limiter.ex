defmodule YoutubeThing.RateLimiter do
  @moduledoc """
  Rate limiter using Hammer v7 with ETS backend.

  Provides per-IP and per-user rate limiting for transcript extraction.

  Limits:
  - Per-IP: 1 request per 10 seconds
  - Global daily: 1000 requests per day
  """

  use Hammer, backend: :ets

  @per_ip_scale :timer.seconds(10)
  @per_ip_limit 1

  @global_daily_scale :timer.hours(24)
  @global_daily_limit 1000

  @doc """
  Check if a request from the given IP is allowed.

  Returns `:ok` if allowed, or `{:error, :rate_limited}` with retry info.
  """
  @spec check_ip(String.t()) :: :ok | {:error, {:rate_limited, non_neg_integer()}}
  def check_ip(ip) do
    case hit("ip:#{ip}", @per_ip_scale, @per_ip_limit) do
      {:allow, _count} -> :ok
      {:deny, retry_after_ms} -> {:error, {:rate_limited, div(retry_after_ms, 1000)}}
    end
  end

  @doc """
  Check if the global daily limit has been reached.

  Returns `:ok` if under limit, or `{:error, :daily_limit_reached}`.
  """
  @spec check_global_daily() :: :ok | {:error, :daily_limit_reached}
  def check_global_daily do
    case hit("global:daily", @global_daily_scale, @global_daily_limit) do
      {:allow, _count} -> :ok
      {:deny, _retry_after} -> {:error, :daily_limit_reached}
    end
  end

  @doc """
  Check per-user rate limit (additional layer for authenticated users).

  Returns `:ok` if allowed, or `{:error, {:rate_limited, seconds}}`.
  """
  @spec check_user(integer()) :: :ok | {:error, {:rate_limited, non_neg_integer()}}
  def check_user(user_id) do
    case hit("user:#{user_id}", @per_ip_scale, @per_ip_limit) do
      {:allow, _count} -> :ok
      {:deny, retry_after_ms} -> {:error, {:rate_limited, div(retry_after_ms, 1000)}}
    end
  end

  @doc """
  Check all rate limits for a request.

  Checks IP limit first, then global daily limit.
  Returns `:ok` or the first error encountered.
  """
  @spec check_rate(String.t(), integer() | nil) ::
          :ok | {:error, {:rate_limited, non_neg_integer()} | :daily_limit_reached}
  def check_rate(ip, user_id \\ nil) do
    with :ok <- check_ip(ip),
         :ok <- check_global_daily() do
      if user_id do
        check_user(user_id)
      else
        :ok
      end
    end
  end
end
