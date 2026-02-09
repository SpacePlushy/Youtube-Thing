defmodule YoutubeThingWeb.HomeLive do
  use YoutubeThingWeb, :live_view

  alias YoutubeThing.TranscriptExtractor
  alias YoutubeThing.UsageTracker

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       page_title: "Extract Transcripts",
       url: "",
       language: "en",
       transcript_origin: "auto_generated",
       loading: false,
       error: nil,
       segments: [],
       copy_notification: nil,
       export_format: "txt"
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-[calc(100vh-3.5rem)]">
      <.copy_notification message={@copy_notification} />

      <%= if @segments == [] do %>
        <!-- ═══ HERO STATE ═══ -->
        <div class="max-w-2xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16">
          <!-- Tagline -->
          <div class="text-center mb-10 stagger-in">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-6">
              <div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
              <span class="text-xs font-medium text-primary tracking-wide uppercase">Instant Extraction</span>
            </div>

            <h1 class="text-3xl sm:text-5xl font-bold text-base-content tracking-tight leading-[1.1] mb-4">
              YouTube transcripts,<br/>
              <span class="text-primary">in seconds.</span>
            </h1>

            <p class="text-base-content/50 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
              Paste a URL, get the transcript. Export as TXT, SRT, VTT, or JSON.
            </p>
          </div>

          <!-- Extract Form -->
          <div class="yt-card p-5 sm:p-7 stagger-in" style="animation-delay: 100ms">
            <.extraction_form
              url={@url}
              language={@language}
              transcript_origin={@transcript_origin}
              loading={@loading}
            />
            <.error_alert message={@error} />
          </div>

          <!-- Features -->
          <div class="grid grid-cols-3 gap-3 mt-8 stagger-in" style="animation-delay: 200ms">
            <div class="text-center p-3">
              <div class="text-2xl font-bold text-base-content font-mono mb-1">12+</div>
              <span class="text-xs text-base-content/40 uppercase tracking-wider">Languages</span>
            </div>
            <div class="text-center p-3 border-x border-base-300">
              <div class="text-2xl font-bold text-base-content font-mono mb-1">&lt;5s</div>
              <span class="text-xs text-base-content/40 uppercase tracking-wider">Avg Speed</span>
            </div>
            <div class="text-center p-3">
              <div class="text-2xl font-bold text-base-content font-mono mb-1">4</div>
              <span class="text-xs text-base-content/40 uppercase tracking-wider">Formats</span>
            </div>
          </div>
        </div>
      <% else %>
        <!-- ═══ RESULTS STATE ═══ -->
        <div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-16">
          <.transcript_actions segments={@segments} export_format={@export_format} />
          <.transcript_viewer segments={@segments} />

          <!-- Extract another -->
          <div class="mt-6">
            <.extraction_form
              url={@url}
              language={@language}
              transcript_origin={@transcript_origin}
              loading={@loading}
              compact={true}
            />
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  @impl true
  def handle_event("validate_url", %{"url" => url}, socket) do
    {:noreply, assign(socket, url: url)}
  end

  @impl true
  def handle_event("extract", params, socket) do
    url = String.trim(params["url"] || "")

    if url == "" do
      {:noreply, assign(socket, error: "Please enter a YouTube URL or video ID")}
    else
      socket =
        socket
        |> assign(url: url, loading: true, error: nil, segments: [])

      send(self(), {:do_extract, url})
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("reset", _params, socket) do
    {:noreply, assign(socket, segments: [], url: "", error: nil, export_format: "txt")}
  end

  @impl true
  def handle_event("change_format", %{"export_format" => format}, socket) do
    {:noreply, assign(socket, export_format: format)}
  end

  @impl true
  def handle_event("copy_notification", %{"message" => message}, socket) do
    Process.send_after(self(), :clear_copy_notification, 2000)
    {:noreply, assign(socket, copy_notification: message)}
  end

  @impl true
  def handle_info(:clear_copy_notification, socket) do
    {:noreply, assign(socket, copy_notification: nil)}
  end

  @impl true
  def handle_info({:do_extract, url}, socket) do
    case TranscriptExtractor.extract_video_id(url) do
      {:ok, video_id} ->
        socket = maybe_check_usage(socket, video_id)
        {:noreply, socket}

      :error ->
        {:noreply,
         assign(socket,
           loading: false,
           error: "Invalid YouTube URL or video ID. Please check and try again."
         )}
    end
  end

  defp maybe_check_usage(socket, video_id) do
    user = get_user(socket)

    if user do
      tier = user.subscription_tier || :free

      case UsageTracker.check_usage(user.id, tier) do
        :ok ->
          do_extract(socket, video_id)

        {:error, :usage_limit_reached} ->
          assign(socket,
            loading: false,
            error: "Daily limit reached. Upgrade to Pro for unlimited transcripts."
          )
      end
    else
      do_extract(socket, video_id)
    end
  end

  defp do_extract(socket, video_id) do
    case TranscriptExtractor.fetch_transcript_with_fallback(video_id) do
      {:ok, %{transcript: segments}} ->
        assign(socket,
          loading: false,
          segments: segments,
          error: nil
        )

      {:error, :no_captions_available} ->
        assign(socket,
          loading: false,
          error: "No captions available for this video."
        )

      {:error, _reason} ->
        assign(socket,
          loading: false,
          error: "Failed to extract transcript. Please try again."
        )
    end
  end

  defp get_user(socket) do
    case socket.assigns do
      %{current_scope: %{user: %{id: _} = user}} -> user
      _ -> nil
    end
  end
end
