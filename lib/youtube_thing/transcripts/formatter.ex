defmodule YoutubeThing.Transcripts.Formatter do
  @moduledoc "Formats transcript segments into various export formats."

  @doc "Formats segments as plain text with timestamps."
  def to_txt(segments) do
    segments
    |> Enum.map(fn seg -> "[#{seg.timestamp}] #{seg.text}" end)
    |> Enum.join("\n")
  end

  @doc "Formats segments as SRT (SubRip) subtitle format."
  def to_srt(segments) do
    segments
    |> Enum.with_index(1)
    |> Enum.map(fn {seg, idx} ->
      start_ms = timestamp_to_ms(seg.timestamp)
      end_ms = start_ms + trunc(seg.duration * 1000)

      "#{idx}\n#{format_srt_time(start_ms)} --> #{format_srt_time(end_ms)}\n#{seg.text}"
    end)
    |> Enum.join("\n\n")
  end

  @doc "Formats segments as WebVTT subtitle format."
  def to_vtt(segments) do
    body =
      segments
      |> Enum.map(fn seg ->
        start_ms = timestamp_to_ms(seg.timestamp)
        end_ms = start_ms + trunc(seg.duration * 1000)

        "#{format_vtt_time(start_ms)} --> #{format_vtt_time(end_ms)}\n#{seg.text}"
      end)
      |> Enum.join("\n\n")

    "WEBVTT\n\n#{body}"
  end

  @doc "Formats segments as structured JSON."
  def to_json(segments) do
    data = %{
      segments:
        Enum.map(segments, fn seg ->
          %{
            text: seg.text,
            timestamp: seg.timestamp,
            start_ms: timestamp_to_ms(seg.timestamp),
            duration: seg.duration
          }
        end),
      total_segments: length(segments)
    }

    Jason.encode!(data, pretty: true)
  end

  @doc "Dispatch function: format segments by format string."
  def format(segments, "txt"), do: to_txt(segments)
  def format(segments, "srt"), do: to_srt(segments)
  def format(segments, "vtt"), do: to_vtt(segments)
  def format(segments, "json"), do: to_json(segments)
  def format(segments, _), do: to_txt(segments)

  @doc "Returns the MIME type for a given format."
  def mime_type("srt"), do: "application/x-subrip"
  def mime_type("vtt"), do: "text/vtt"
  def mime_type("json"), do: "application/json"
  def mime_type(_), do: "text/plain"

  @doc "Returns the file extension for a given format."
  def file_extension(format), do: format

  # Parse timestamp string like "1:05" or "1:01:01" to milliseconds
  defp timestamp_to_ms(timestamp) do
    parts = String.split(timestamp, ":")

    case parts do
      [h, m, s] ->
        (String.to_integer(h) * 3600 + String.to_integer(m) * 60 + String.to_integer(s)) * 1000

      [m, s] ->
        (String.to_integer(m) * 60 + String.to_integer(s)) * 1000

      _ ->
        0
    end
  end

  # Format milliseconds to SRT time format: HH:MM:SS,mmm
  defp format_srt_time(ms) do
    total_seconds = div(ms, 1000)
    milliseconds = rem(ms, 1000)
    hours = div(total_seconds, 3600)
    minutes = div(rem(total_seconds, 3600), 60)
    seconds = rem(total_seconds, 60)

    "#{pad2(hours)}:#{pad2(minutes)}:#{pad2(seconds)},#{pad3(milliseconds)}"
  end

  # Format milliseconds to VTT time format: HH:MM:SS.mmm
  defp format_vtt_time(ms) do
    total_seconds = div(ms, 1000)
    milliseconds = rem(ms, 1000)
    hours = div(total_seconds, 3600)
    minutes = div(rem(total_seconds, 3600), 60)
    seconds = rem(total_seconds, 60)

    "#{pad2(hours)}:#{pad2(minutes)}:#{pad2(seconds)}.#{pad3(milliseconds)}"
  end

  defp pad2(n), do: String.pad_leading(Integer.to_string(n), 2, "0")
  defp pad3(n), do: String.pad_leading(Integer.to_string(n), 3, "0")
end
