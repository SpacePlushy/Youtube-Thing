defmodule YoutubeThing.Workers.TranscriptCleanupWorker do
  @moduledoc """
  Daily cron worker that cleans up old cached transcript data.

  Runs at 3 AM UTC via Oban cron scheduler.
  """

  use Oban.Worker, queue: :default, max_attempts: 1

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    Logger.info("[TranscriptCleanup] Starting daily cleanup")

    {:ok, count} = YoutubeThing.Cache.clear_all()
    Logger.info("[TranscriptCleanup] Cleared #{count} cached entries")

    :ok
  end
end
