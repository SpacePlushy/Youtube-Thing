defmodule YoutubeThing.TranscriptExtractor do
  @moduledoc """
  Extracts transcripts from YouTube videos.

  Uses youtube-transcript.io API as the primary provider,
  with a fallback to scraping YouTube's timedtext XML endpoint.
  """

  require Logger

  @api_url "https://www.youtube-transcript.io/api/transcripts"
  @video_id_regex ~r/^[a-zA-Z0-9_-]{11}$/
  @url_patterns [
    ~r/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ~r/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ]

  @type segment :: %{text: String.t(), timestamp: String.t(), duration: float()}
  @type fetch_result :: %{
          transcript: [segment()],
          provider: :youtube_transcript_io | :youtube_fallback,
          title: String.t() | nil
        }

  @doc """
  Extract a YouTube video ID from a URL or raw ID string.

  Supports:
  - Raw 11-character video IDs
  - youtube.com/watch?v=...
  - youtu.be/...
  - youtube.com/embed/...
  - youtube.com/v/...
  - youtube.com/shorts/...

  Returns `{:ok, video_id}` or `:error`.
  """
  @spec extract_video_id(String.t()) :: {:ok, String.t()} | :error
  def extract_video_id(input) do
    trimmed = String.trim(input)

    if Regex.match?(@video_id_regex, trimmed) do
      {:ok, trimmed}
    else
      extract_from_url(trimmed)
    end
  end

  defp extract_from_url(url) do
    Enum.find_value(@url_patterns, :error, fn pattern ->
      case Regex.run(pattern, url) do
        [_, video_id] -> {:ok, video_id}
        _ -> nil
      end
    end)
  end

  @doc """
  Fetch transcript from the youtube-transcript.io API (primary provider).
  """
  @spec fetch_from_api(String.t()) :: {:ok, fetch_result()} | {:error, term()}
  def fetch_from_api(video_id) do
    api_token = Application.get_env(:youtube_thing, :youtube_transcript_io_token)

    if is_nil(api_token) or api_token == "" do
      {:error, :api_token_not_configured}
    else
      do_fetch_from_api(video_id, api_token)
    end
  end

  defp do_fetch_from_api(video_id, api_token) do
    case Req.post(@api_url,
           json: %{ids: [video_id]},
           headers: [{"authorization", "Basic #{api_token}"}],
           receive_timeout: 15_000
         ) do
      {:ok, %Req.Response{status: 429, headers: headers}} ->
        retry_after = get_retry_after(headers)
        {:error, {:rate_limited, retry_after}}

      {:ok, %Req.Response{status: status}} when status not in 200..299 ->
        {:error, {:api_error, status}}

      {:ok, %Req.Response{status: 200, body: body}} ->
        parse_api_response(body)

      {:error, reason} ->
        {:error, {:request_failed, reason}}
    end
  end

  defp get_retry_after(headers) do
    case List.keyfind(headers, "retry-after", 0) do
      {_, value} -> parse_integer(value, 10)
      nil -> 10
    end
  end

  defp parse_integer(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {n, _} -> n
      :error -> default
    end
  end

  defp parse_integer(value, _default) when is_integer(value), do: value
  defp parse_integer(_value, default), do: default

  defp parse_api_response(body) when is_list(body) and length(body) > 0 do
    result = List.first(body)

    if is_map(result) and Map.has_key?(result, "error") do
      {:error, {:api_error, result["error"]}}
    else
      parse_tracks(result)
    end
  end

  defp parse_api_response(_body), do: {:error, :no_data}

  defp parse_tracks(result) do
    tracks = result["tracks"] || []

    case tracks do
      [first_track | _] ->
        raw_transcript = first_track["transcript"] || []

        if raw_transcript == [] do
          {:error, :no_captions}
        else
          segments =
            Enum.map(raw_transcript, fn item ->
              start_seconds = parse_float(item["start"])
              duration = parse_float(item["dur"])

              %{
                text: item["text"] || "",
                timestamp: format_timestamp(start_seconds),
                duration: duration
              }
            end)

          {:ok,
           %{
             transcript: segments,
             provider: :youtube_transcript_io,
             title: result["title"]
           }}
        end

      [] ->
        {:error, :no_captions}
    end
  end

  @doc """
  Fetch transcript from YouTube's timedtext XML endpoint (fallback provider).
  """
  @spec fetch_from_youtube(String.t()) :: {:ok, fetch_result()} | {:error, term()}
  def fetch_from_youtube(video_id) do
    # First, get the video page to find the timedtext URL
    video_url = "https://www.youtube.com/watch?v=#{video_id}"

    case Req.get(video_url,
           headers: [
             {"user-agent",
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
             {"accept-language", "en-US,en;q=0.9"}
           ],
           receive_timeout: 15_000
         ) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        extract_timedtext_from_page(body, video_id)

      {:ok, %Req.Response{status: status}} ->
        {:error, {:youtube_error, status}}

      {:error, reason} ->
        {:error, {:request_failed, reason}}
    end
  end

  defp extract_timedtext_from_page(html, _video_id) do
    # Extract captions URL from the page source
    case Regex.run(~r/"captionTracks":\[(\{.*?\})\]/, html) do
      [_, json_str] ->
        case Jason.decode("[#{json_str}]") do
          {:ok, [%{"baseUrl" => base_url} | _]} ->
            fetch_timedtext_xml(base_url)

          _ ->
            {:error, :no_captions}
        end

      nil ->
        {:error, :no_captions}
    end
  end

  defp fetch_timedtext_xml(url) do
    case Req.get(url, receive_timeout: 10_000) do
      {:ok, %Req.Response{status: 200, body: body}} ->
        parse_timedtext_xml(body)

      {:ok, %Req.Response{status: status}} ->
        {:error, {:timedtext_error, status}}

      {:error, reason} ->
        {:error, {:request_failed, reason}}
    end
  end

  defp parse_timedtext_xml(xml_body) do
    case Floki.parse_document(xml_body) do
      {:ok, document} ->
        segments =
          document
          |> Floki.find("text")
          |> Enum.map(fn element ->
            text =
              element
              |> Floki.text()
              |> String.replace("&amp;", "&")
              |> String.replace("&#39;", "'")
              |> String.replace("&quot;", "\"")
              |> String.replace("&lt;", "<")
              |> String.replace("&gt;", ">")

            start_seconds =
              element
              |> Floki.attribute("start")
              |> List.first("")
              |> parse_float()

            duration =
              element
              |> Floki.attribute("dur")
              |> List.first("0")
              |> parse_float()

            %{
              text: text,
              timestamp: format_timestamp(start_seconds),
              duration: duration
            }
          end)

        if segments == [] do
          {:error, :no_captions}
        else
          {:ok,
           %{
             transcript: segments,
             provider: :youtube_fallback,
             title: nil
           }}
        end

      {:error, _reason} ->
        {:error, :parse_error}
    end
  end

  @doc """
  Fetch transcript with automatic fallback.

  Tries the youtube-transcript.io API first. If rate-limited, waits and retries once.
  Falls back to YouTube's timedtext XML endpoint on failure.
  """
  @spec fetch_transcript_with_fallback(String.t(), keyword()) ::
          {:ok, fetch_result()} | {:error, term()}
  def fetch_transcript_with_fallback(video_id, opts \\ []) do
    skip_api = Keyword.get(opts, :skip_api, false)

    if skip_api do
      fetch_from_youtube(video_id)
    else
      try_api_then_fallback(video_id)
    end
  end

  defp try_api_then_fallback(video_id) do
    Logger.info("[Transcript] Trying youtube-transcript.io for #{video_id}")

    case fetch_from_api(video_id) do
      {:ok, result} ->
        Logger.info("[Transcript] Success with youtube-transcript.io")
        {:ok, result}

      {:error, {:rate_limited, wait_seconds}} ->
        Logger.warning("[Transcript] Rate limited, waiting #{wait_seconds}s")
        wait_ms = min(wait_seconds * 1000, 10_000)
        Process.sleep(wait_ms)

        case fetch_from_api(video_id) do
          {:ok, result} ->
            Logger.info("[Transcript] Retry succeeded")
            {:ok, result}

          {:error, _reason} ->
            Logger.warning("[Transcript] Retry failed, falling back")
            fallback_to_youtube(video_id)
        end

      {:error, reason} ->
        Logger.warning("[Transcript] API failed: #{inspect(reason)}, falling back")
        fallback_to_youtube(video_id)
    end
  end

  defp fallback_to_youtube(video_id) do
    Logger.info("[Transcript] Falling back to YouTube timedtext for #{video_id}")

    case fetch_from_youtube(video_id) do
      {:ok, result} ->
        Logger.info("[Transcript] Success with YouTube fallback")
        {:ok, result}

      {:error, :no_captions} ->
        {:error, :no_captions_available}

      {:error, _reason} ->
        {:error, :transcript_unavailable}
    end
  end

  @doc """
  Format seconds to a timestamp string (MM:SS or HH:MM:SS).

  ## Examples

      iex> YoutubeThing.TranscriptExtractor.format_timestamp(65.5)
      "1:05"

      iex> YoutubeThing.TranscriptExtractor.format_timestamp(3661.0)
      "1:01:01"
  """
  @spec format_timestamp(number()) :: String.t()
  def format_timestamp(seconds) when is_number(seconds) do
    total_seconds = trunc(seconds)
    hours = div(total_seconds, 3600)
    minutes = div(rem(total_seconds, 3600), 60)
    secs = rem(total_seconds, 60)

    if hours > 0 do
      "#{hours}:#{pad2(minutes)}:#{pad2(secs)}"
    else
      "#{minutes}:#{pad2(secs)}"
    end
  end

  defp pad2(n), do: String.pad_leading(Integer.to_string(n), 2, "0")

  defp parse_float(value) when is_binary(value) do
    case Float.parse(value) do
      {f, _} -> f
      :error -> 0.0
    end
  end

  defp parse_float(value) when is_float(value), do: value
  defp parse_float(value) when is_integer(value), do: value * 1.0
  defp parse_float(_), do: 0.0
end
