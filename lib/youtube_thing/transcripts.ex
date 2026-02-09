defmodule YoutubeThing.Transcripts do
  @moduledoc """
  The Transcripts context.
  """

  import Ecto.Query, warn: false
  alias YoutubeThing.Repo
  alias YoutubeThing.Transcripts.Transcript
  alias YoutubeThing.{Cache, TranscriptExtractor, UsageTracker}

  require Logger

  @doc """
  Extract a transcript for a video, checking usage limits and caching.

  Orchestrates the full flow:
  1. Parse the video ID from input
  2. Check usage limits for the user
  3. Check cache for existing transcript
  4. Fetch from API with fallback
  5. Cache the result
  6. Save to database

  Returns `{:ok, transcript}` or `{:error, reason}`.
  """
  def extract_transcript(user, input) do
    with {:ok, video_id} <- parse_video_id(input),
         :ok <- UsageTracker.check_usage(user.id, user.subscription_tier) do
      Cache.fetch_transcript(video_id, fn ->
        case TranscriptExtractor.fetch_transcript_with_fallback(video_id) do
          {:ok, result} ->
            transcript_text =
              result.transcript
              |> Enum.map(fn seg -> "[#{seg.timestamp}] #{seg.text}" end)
              |> Enum.join("\n")

            save_attrs = %{
              video_id: video_id,
              video_title: result.title,
              transcript_text: transcript_text,
              language: "en"
            }

            case save_transcript(user.id, save_attrs) do
              {:ok, transcript} ->
                {:ok, Map.put(result, :transcript_record, transcript)}

              {:error, changeset} ->
                Logger.warning("[Transcripts] Failed to save: #{inspect(changeset.errors)}")
                {:ok, result}
            end

          error ->
            error
        end
      end)
    end
  end

  defp parse_video_id(input) do
    case TranscriptExtractor.extract_video_id(input) do
      {:ok, _video_id} = ok -> ok
      :error -> {:error, :invalid_video_url}
    end
  end

  @doc """
  Saves a transcript for the given user.
  """
  def save_transcript(user_id, attrs) do
    %Transcript{user_id: user_id}
    |> Transcript.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Lists transcripts for a user with pagination, search, and filtering.

  ## Options
    * `:page` - Page number (default: 1)
    * `:per_page` - Results per page (default: 20)
    * `:search` - Search term to filter by title, channel, or video ID
    * `:language` - Language code to filter by (e.g. "en", "es")
  """
  def list_user_transcripts(user_id, opts \\ []) do
    page = Keyword.get(opts, :page, 1)
    per_page = Keyword.get(opts, :per_page, 20)
    search = Keyword.get(opts, :search)
    language = Keyword.get(opts, :language)
    offset = (page - 1) * per_page

    Transcript
    |> where(user_id: ^user_id)
    |> maybe_search(search)
    |> maybe_filter_language(language)
    |> order_by(desc: :inserted_at)
    |> limit(^per_page)
    |> offset(^offset)
    |> Repo.all()
  end

  defp maybe_search(query, nil), do: query
  defp maybe_search(query, ""), do: query

  defp maybe_search(query, search) do
    search_term = "%#{search}%"

    where(
      query,
      [t],
      ilike(t.video_title, ^search_term) or ilike(t.channel_name, ^search_term) or
        ilike(t.video_id, ^search_term)
    )
  end

  defp maybe_filter_language(query, nil), do: query
  defp maybe_filter_language(query, ""), do: query
  defp maybe_filter_language(query, "all"), do: query
  defp maybe_filter_language(query, language), do: where(query, [t], t.language == ^language)

  @doc """
  Gets a single transcript for the given user.

  Raises `Ecto.NoResultsError` if the Transcript does not exist for that user.
  """
  def get_transcript!(user_id, id) do
    Transcript
    |> where(user_id: ^user_id)
    |> Repo.get!(id)
  end

  @doc """
  Deletes a transcript belonging to the given user.
  """
  def delete_transcript(user_id, id) do
    transcript = get_transcript!(user_id, id)
    Repo.delete(transcript)
  end
end
