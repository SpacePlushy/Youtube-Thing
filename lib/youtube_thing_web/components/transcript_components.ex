defmodule YoutubeThingWeb.TranscriptComponents do
  @moduledoc """
  Reusable function components for transcript display, forms, and UI elements.
  """
  use Phoenix.Component

  import YoutubeThingWeb.CoreComponents, only: [icon: 1]

  alias Phoenix.LiveView.JS
  alias YoutubeThing.Transcripts.Formatter

  @languages [
    {"English", "en"},
    {"Spanish", "es"},
    {"French", "fr"},
    {"German", "de"},
    {"Italian", "it"},
    {"Portuguese", "pt"},
    {"Russian", "ru"},
    {"Japanese", "ja"},
    {"Korean", "ko"},
    {"Chinese", "zh"},
    {"Arabic", "ar"},
    {"Hindi", "hi"}
  ]

  @doc """
  Returns the list of supported languages as {label, value} tuples.
  """
  def supported_languages, do: @languages

  # ── Extraction Form ──

  attr :url, :string, required: true
  attr :language, :string, required: true
  attr :transcript_origin, :string, required: true
  attr :loading, :boolean, default: false
  attr :compact, :boolean, default: false

  def extraction_form(assigns) do
    ~H"""
    <form phx-submit="extract" class={if @compact, do: "flex gap-2", else: "space-y-4"}>
      <div class={if @compact, do: "flex-1"}>
        <%= unless @compact do %>
          <label class="block text-xs font-medium text-base-content/50 uppercase tracking-wider mb-2">
            Video URL or ID
          </label>
        <% end %>
        <input
          type="text"
          name="url"
          value={@url}
          placeholder="youtube.com/watch?v=... or paste video ID"
          class={[
            "w-full px-4 py-2.5 rounded-md bg-base-200 border border-base-300 text-base-content text-sm",
            "placeholder:text-base-content/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30",
            "transition-all duration-150",
            @compact && "py-2"
          ]}
          disabled={@loading}
          autofocus={!@compact}
          phx-change="validate_url"
        />
      </div>

      <%= unless @compact do %>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-base-content/50 uppercase tracking-wider mb-2">
              Language
            </label>
            <select
              name="language"
              class="w-full px-3 py-2 rounded-md bg-base-200 border border-base-300 text-sm text-base-content focus:outline-none focus:border-primary"
              disabled={@loading}
            >
              <%= for {label, value} <- supported_languages() do %>
                <option value={value} selected={value == @language}>{label}</option>
              <% end %>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-base-content/50 uppercase tracking-wider mb-2">
              Type
            </label>
            <select
              name="transcript_origin"
              class="w-full px-3 py-2 rounded-md bg-base-200 border border-base-300 text-sm text-base-content focus:outline-none focus:border-primary"
              disabled={@loading}
            >
              <option value="auto_generated" selected={@transcript_origin == "auto_generated"}>
                Auto-generated
              </option>
              <option value="uploader_provided" selected={@transcript_origin == "uploader_provided"}>
                Uploader provided
              </option>
            </select>
          </div>
        </div>
      <% end %>

      <button
        type="submit"
        disabled={@loading}
        class={[
          "btn btn-primary text-sm font-medium",
          if(@compact, do: "btn-sm px-4", else: "w-full"),
          @loading && "btn-disabled"
        ]}
      >
        <%= if @loading do %>
          <span class="loading loading-spinner loading-xs"></span>
          <%= unless @compact, do: "Extracting..." %>
        <% else %>
          <.icon name="hero-bolt-solid" class="size-3.5" />
          <%= if @compact, do: "Go", else: "Extract Transcript" %>
        <% end %>
      </button>
    </form>
    """
  end

  # ── Transcript Viewer ──

  attr :segments, :list, required: true
  attr :id, :string, default: "transcript-viewer"

  def transcript_viewer(assigns) do
    ~H"""
    <div class="yt-card overflow-hidden" id={@id}>
      <div class="px-5 py-3 border-b border-base-300 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <.icon name="hero-document-text" class="size-3 text-primary" />
          </div>
          <span class="text-sm font-medium text-base-content">Transcript</span>
        </div>
        <span class="text-xs text-base-content/40 font-mono">{length(@segments)} segments</span>
      </div>

      <div class="max-h-[520px] overflow-y-auto">
        <div class="p-4 space-y-0.5" id={"#{@id}-segments"}>
          <div
            :for={{segment, idx} <- Enum.with_index(@segments)}
            class="flex gap-3 py-2 px-2 rounded hover:bg-base-200/50 transition-colors transcript-segment group"
            style={"animation-delay: #{min(idx * 15, 500)}ms"}
          >
            <span class="ts-pill text-primary bg-primary/8 border border-primary/10 mt-0.5 shrink-0">
              {segment.timestamp}
            </span>
            <p class="text-[13px] text-base-content/75 leading-relaxed group-hover:text-base-content/90 transition-colors">
              {segment.text}
            </p>
          </div>
        </div>
      </div>
    </div>
    """
  end

  # ── Transcript Action Bar ──

  attr :segments, :list, required: true
  attr :export_format, :string, default: "txt"

  def transcript_actions(assigns) do
    format = assigns.export_format
    formatted = Formatter.format(assigns.segments, format)
    mime = Formatter.mime_type(format)
    ext = Formatter.file_extension(format)

    assigns =
      assigns
      |> assign(:full_text, formatted)
      |> assign(:mime_type, mime)
      |> assign(:filename, "transcript.#{ext}")

    ~H"""
    <div class="flex items-center justify-between mb-4">
      <button phx-click="reset" class="flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors">
        <.icon name="hero-arrow-left" class="size-3.5" />
        <span>New</span>
      </button>

      <div class="flex items-center gap-1">
        <select
          name="export_format"
          class="select select-ghost select-xs text-xs font-mono h-7 min-h-0"
          phx-change="change_format"
        >
          <option value="txt" selected={@export_format == "txt"}>TXT</option>
          <option value="srt" selected={@export_format == "srt"}>SRT</option>
          <option value="vtt" selected={@export_format == "vtt"}>VTT</option>
          <option value="json" selected={@export_format == "json"}>JSON</option>
        </select>

        <button
          id="copy-transcript-btn"
          phx-hook="CopyToClipboard"
          data-content={@full_text}
          class="btn btn-ghost btn-xs gap-1 h-7 min-h-0 text-xs"
        >
          <.icon name="hero-clipboard-document" class="size-3" />
          Copy
        </button>

        <button
          id="download-transcript-btn"
          phx-hook="DownloadFile"
          data-content={@full_text}
          data-filename={@filename}
          data-mime-type={@mime_type}
          class="btn btn-ghost btn-xs gap-1 h-7 min-h-0 text-xs"
        >
          <.icon name="hero-arrow-down-tray" class="size-3" />
          Download
        </button>
      </div>
    </div>
    """
  end

  # ── Feature Badge Row ──

  def feature_badges(assigns) do
    ~H"""
    <div class="grid grid-cols-3 gap-4 mt-8">
      <div class="flex flex-col items-center gap-2 p-4 text-center">
        <div class="w-10 h-10 flex items-center justify-center bg-base-300 rounded-xl">
          <.icon name="hero-globe-alt" class="size-5 text-base-content/60" />
        </div>
        <span class="text-sm text-base-content/60">12+ Languages</span>
      </div>
      <div class="flex flex-col items-center gap-2 p-4 text-center">
        <div class="w-10 h-10 flex items-center justify-center bg-base-300 rounded-xl">
          <.icon name="hero-bolt" class="size-5 text-base-content/60" />
        </div>
        <span class="text-sm text-base-content/60">Ultra-Fast</span>
      </div>
      <div class="flex flex-col items-center gap-2 p-4 text-center">
        <div class="w-10 h-10 flex items-center justify-center bg-base-300 rounded-xl">
          <.icon name="hero-document-text" class="size-5 text-base-content/60" />
        </div>
        <span class="text-sm text-base-content/60">Clean Output</span>
      </div>
    </div>
    """
  end

  # ── Copy Notification Toast ──

  attr :message, :string, default: nil

  def copy_notification(assigns) do
    ~H"""
    <div
      :if={@message}
      id="copy-notification"
      class="fixed top-8 left-1/2 -translate-x-1/2 z-50"
      phx-mounted={
        JS.show(
          transition: {"ease-out duration-200", "opacity-0 -translate-y-4", "opacity-100 translate-y-0"}
        )
      }
    >
      <div class="flex items-center gap-2 px-4 py-2 bg-base-content text-base-100 text-xs font-medium rounded-md shadow-lg">
        <.icon name="hero-check" class="size-3.5" />
        {@message}
      </div>
    </div>
    """
  end

  # ── Error Alert ──

  attr :message, :string, default: nil

  def error_alert(assigns) do
    ~H"""
    <div :if={@message} class="mt-4 flex items-start gap-2.5 p-3 bg-error/8 border border-error/15 rounded-md">
      <.icon name="hero-exclamation-circle" class="size-4 text-error shrink-0 mt-0.5" />
      <span class="text-sm text-error/90">{@message}</span>
    </div>
    """
  end

  # ── Usage Progress Bar ──

  attr :current, :integer, required: true
  attr :limit, :integer, required: true
  attr :label, :string, default: "Daily usage"

  def usage_progress(assigns) do
    pct = if assigns.limit > 0, do: min(round(assigns.current / assigns.limit * 100), 100), else: 0
    assigns = assign(assigns, :pct, pct)

    ~H"""
    <div>
      <div class="flex justify-between text-xs mb-2">
        <span class="text-base-content/50 uppercase tracking-wider">{@label}</span>
        <span class="font-mono font-medium text-base-content">{@current}<span class="text-base-content/30">/{@limit}</span></span>
      </div>
      <div class="h-1.5 bg-base-200 rounded-full overflow-hidden">
        <div class={[
          "h-full rounded-full transition-all duration-500",
          @pct < 80 && "bg-primary",
          @pct >= 80 && @pct < 100 && "bg-warning",
          @pct >= 100 && "bg-error"
        ]} style={"width: #{@pct}%"}>
        </div>
      </div>
    </div>
    """
  end

  # ── Pricing Feature Item ──

  attr :included, :boolean, required: true
  attr :text, :string, required: true

  def pricing_feature(assigns) do
    ~H"""
    <li class="flex items-center gap-2.5 py-1">
      <%= if @included do %>
        <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <.icon name="hero-check" class="size-2.5 text-primary" />
        </div>
        <span class="text-sm text-base-content/80">{@text}</span>
      <% else %>
        <div class="w-4 h-4 rounded-full bg-base-300 flex items-center justify-center shrink-0">
          <.icon name="hero-x-mark" class="size-2.5 text-base-content/25" />
        </div>
        <span class="text-sm text-base-content/35">{@text}</span>
      <% end %>
    </li>
    """
  end
end
