defmodule YoutubeThingWeb.Plugs.RateLimiter do
  @moduledoc """
  Plug that enforces rate limiting on incoming requests.

  Bypasses rate limiting for auth and webhook routes.
  Uses per-IP and global daily limits via `YoutubeThing.RateLimiter`.
  """

  import Plug.Conn

  @behaviour Plug

  @bypass_prefixes ["/api/auth", "/api/webhooks", "/users/log-in", "/users/register"]

  @impl Plug
  def init(opts), do: opts

  @impl Plug
  def call(conn, _opts) do
    if bypass_route?(conn.request_path) do
      conn
    else
      check_rate_limit(conn)
    end
  end

  defp bypass_route?(path) do
    Enum.any?(@bypass_prefixes, &String.starts_with?(path, &1))
  end

  defp check_rate_limit(conn) do
    ip = get_client_ip(conn)
    user_id = get_user_id(conn)

    case YoutubeThing.RateLimiter.check_rate(ip, user_id) do
      :ok ->
        conn

      {:error, {:rate_limited, retry_after}} ->
        conn
        |> put_resp_header("retry-after", Integer.to_string(retry_after))
        |> send_resp(429, Jason.encode!(%{error: "Too many requests", retry_after: retry_after}))
        |> halt()

      {:error, :daily_limit_reached} ->
        conn
        |> send_resp(429, Jason.encode!(%{error: "Daily request limit reached"}))
        |> halt()
    end
  end

  defp get_client_ip(conn) do
    # Check X-Forwarded-For header first (for proxied requests)
    case get_req_header(conn, "x-forwarded-for") do
      [forwarded | _] ->
        forwarded
        |> String.split(",")
        |> List.first()
        |> String.trim()

      [] ->
        conn.remote_ip
        |> :inet.ntoa()
        |> to_string()
    end
  end

  defp get_user_id(conn) do
    case conn.assigns do
      %{current_scope: %{user: %{id: id}}} -> id
      %{current_user: %{id: id}} -> id
      _ -> nil
    end
  end
end
