defmodule YoutubeThingWeb.CacheBodyReader do
  @moduledoc """
  A custom body reader that caches the raw request body.

  This is needed for Stripe webhook signature verification, which requires
  the raw, unparsed body. Plug.Parsers consumes the body, so we cache it
  in the connection's private assigns before parsing.

  ## Usage

  Configure in the endpoint before Plug.Parsers:

      plug Plug.Parsers,
        body_reader: {YoutubeThingWeb.CacheBodyReader, :read_body, []},
        ...
  """

  def read_body(conn, opts) do
    case Plug.Conn.read_body(conn, opts) do
      {:ok, body, conn} ->
        conn = update_in(conn.private[:raw_body], &[body | &1 || []])
        {:ok, body, conn}

      {:more, body, conn} ->
        conn = update_in(conn.private[:raw_body], &[body | &1 || []])
        {:more, body, conn}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Returns the cached raw body from the connection.
  """
  def get_raw_body(conn) do
    case conn.private[:raw_body] do
      nil -> ""
      chunks -> chunks |> Enum.reverse() |> Enum.join("")
    end
  end
end
