defmodule YoutubeThingWeb.DashboardLive do
  use YoutubeThingWeb, :live_view

  alias YoutubeThing.Transcripts
  alias YoutubeThing.Subscriptions
  alias YoutubeThing.UsageTracker

  @per_page 10

  @impl true
  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user
    tier = user.subscription_tier || :free
    usage = UsageTracker.get_usage(user.id)
    daily_limit = UsageTracker.daily_limit(tier)
    transcripts = Transcripts.list_user_transcripts(user.id, page: 1, per_page: @per_page)

    {:ok,
     assign(socket,
       page_title: "Dashboard",
       user: user,
       tier: tier,
       usage: usage,
       daily_limit: if(daily_limit == :unlimited, do: 999, else: daily_limit),
       is_unlimited: daily_limit == :unlimited,
       transcripts: transcripts,
       page: 1,
       search_term: "",
       language_filter: "all",
       portal_loading: false
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-[calc(100vh-3.5rem)]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <!-- Header -->
        <div class="mb-10 stagger-in">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span class="text-sm font-bold text-primary">
                {String.first(@user.email) |> String.upcase()}
              </span>
            </div>
            <div>
              <h1 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight">
                Welcome back{if @user.email, do: ", #{@user.email |> String.split("@") |> List.first()}", else: ""}
              </h1>
            </div>
          </div>
          <p class="text-sm text-base-content/40 ml-11">
            Manage your transcripts and subscription
          </p>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 stagger-in" style="animation-delay: 100ms">
          <!-- Usage Card -->
          <div class="yt-card p-5">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider">Usage</span>
              <span class={[
                "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                @tier == :pro && "bg-primary/10 text-primary border border-primary/20",
                @tier == :free && "bg-base-300 text-base-content/50"
              ]}>
                {to_string(@tier)}
              </span>
            </div>

            <%= if @is_unlimited do %>
              <div class="flex items-center gap-2">
                <.icon name="hero-infinity" class="size-5 text-primary" />
                <span class="text-sm text-base-content/70">Unlimited</span>
              </div>
            <% else %>
              <div class="text-2xl font-bold font-mono text-base-content mb-1">
                {@usage}<span class="text-base-content/20">/{@daily_limit}</span>
              </div>
              <div class="h-1 bg-base-200 rounded-full overflow-hidden">
                <% pct = if @daily_limit > 0, do: min(round(@usage / @daily_limit * 100), 100), else: 0 %>
                <div class={[
                  "h-full rounded-full transition-all duration-500",
                  pct < 80 && "bg-primary",
                  pct >= 80 && pct < 100 && "bg-warning",
                  pct >= 100 && "bg-error"
                ]} style={"width: #{pct}%"}>
                </div>
              </div>
              <p class="text-[11px] text-base-content/30 mt-2">Resets at midnight UTC</p>
            <% end %>
          </div>

          <!-- Plan Card -->
          <div class="yt-card p-5">
            <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider block mb-3">Plan</span>
            <div class="text-2xl font-bold text-base-content mb-1">
              {String.capitalize(to_string(@tier))}
            </div>
            <%= if @tier == :free do %>
              <.link href={~p"/pricing"} class="text-xs text-primary hover:underline">
                Upgrade to Pro
              </.link>
            <% else %>
              <span class="text-[11px] text-base-content/30">
                <%= if @user.subscription_period_end do %>
                  Renews {Calendar.strftime(@user.subscription_period_end, "%b %d")}
                <% end %>
              </span>
            <% end %>
          </div>

          <!-- Transcripts Card -->
          <div class="yt-card p-5">
            <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider block mb-3">Transcripts</span>
            <div class="text-2xl font-bold font-mono text-base-content mb-1">
              {length(@transcripts)}
            </div>
            <span class="text-[11px] text-base-content/30">Total saved</span>
          </div>
        </div>

        <!-- Transcript History -->
        <div class="yt-card overflow-hidden stagger-in" style="animation-delay: 200ms">
          <div class="px-5 py-4 border-b border-base-300">
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex items-center gap-2.5 flex-1">
                <div class="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                  <.icon name="hero-document-text" class="size-3 text-primary" />
                </div>
                <span class="text-sm font-medium text-base-content">Recent Transcripts</span>
                <span :if={@search_term != ""} class="text-xs text-base-content/40 font-mono">
                  {length(@transcripts)} results
                </span>
              </div>

              <div class="flex gap-2">
                <form phx-change="search" class="flex-1 sm:flex-none">
                  <input
                    type="text"
                    name="search"
                    value={@search_term}
                    placeholder="Search..."
                    class="w-full sm:w-48 px-3 py-1.5 text-xs rounded-md bg-base-200 border border-base-300 text-base-content placeholder:text-base-content/25 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all duration-150"
                    phx-debounce="300"
                  />
                </form>
                <form phx-change="filter_language">
                  <select
                    name="language"
                    class="px-3 py-1.5 text-xs rounded-md bg-base-200 border border-base-300 text-base-content focus:outline-none focus:border-primary"
                  >
                    <option value="all" selected={@language_filter == "all"}>All</option>
                    <option value="en" selected={@language_filter == "en"}>EN</option>
                    <option value="es" selected={@language_filter == "es"}>ES</option>
                    <option value="fr" selected={@language_filter == "fr"}>FR</option>
                    <option value="de" selected={@language_filter == "de"}>DE</option>
                    <option value="ja" selected={@language_filter == "ja"}>JA</option>
                    <option value="ko" selected={@language_filter == "ko"}>KO</option>
                    <option value="zh" selected={@language_filter == "zh"}>ZH</option>
                  </select>
                </form>
              </div>
            </div>
          </div>

          <%= if @transcripts == [] do %>
            <div class="text-center py-16 px-4">
              <div class="w-12 h-12 mx-auto mb-4 flex items-center justify-center bg-base-200 rounded-xl border border-base-300">
                <.icon name="hero-document-text" class="size-5 text-base-content/25" />
              </div>
              <p class="text-sm text-base-content/40 mb-4">No transcripts yet</p>
              <.link href={~p"/"} class="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <.icon name="hero-bolt-solid" class="size-3" />
                Extract your first transcript
              </.link>
            </div>
          <% else %>
            <div class="divide-y divide-base-300/50">
              <div
                :for={transcript <- @transcripts}
                class="px-5 py-3.5 flex items-center justify-between hover:bg-base-200/30 transition-colors group"
              >
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-base-content truncate group-hover:text-primary transition-colors">
                    {transcript.video_title || transcript.video_id}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-[11px] text-base-content/35 font-mono">
                      {Calendar.strftime(transcript.inserted_at, "%b %d, %Y")}
                    </span>
                    <span :if={transcript.language} class="text-[10px] font-medium uppercase tracking-wider text-base-content/30 bg-base-200 px-1.5 py-0.5 rounded">
                      {transcript.language}
                    </span>
                  </div>
                </div>
                <span class="text-[11px] text-base-content/25 font-mono ml-4 hidden sm:block">
                  {transcript.video_id}
                </span>
              </div>
            </div>

            <div :if={length(@transcripts) >= @per_page} class="px-5 py-3 border-t border-base-300">
              <button
                phx-click="load_more"
                class="w-full text-center text-xs text-base-content/40 hover:text-primary py-1.5 transition-colors"
              >
                Load more
              </button>
            </div>
          <% end %>
        </div>

        <!-- Billing -->
        <div class="yt-card p-5 mt-4 stagger-in" style="animation-delay: 300ms">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-6 h-6 rounded bg-base-200 flex items-center justify-center">
                <.icon name="hero-credit-card" class="size-3 text-base-content/50" />
              </div>
              <div>
                <%= if @tier == :pro do %>
                  <p class="text-sm text-base-content">
                    <span class="font-medium text-primary">Pro</span> plan active
                  </p>
                  <p :if={@user.subscription_period_end} class="text-[11px] text-base-content/35 mt-0.5">
                    Next billing: {Calendar.strftime(@user.subscription_period_end, "%B %d, %Y")}
                  </p>
                <% else %>
                  <p class="text-sm text-base-content">
                    <span class="font-medium">Free</span> plan
                  </p>
                  <p class="text-[11px] text-base-content/35 mt-0.5">
                    Upgrade for unlimited transcripts and history
                  </p>
                <% end %>
              </div>
            </div>

            <%= if @tier == :pro do %>
              <button
                phx-click="manage_billing"
                disabled={@portal_loading}
                class={[
                  "text-xs text-base-content/50 hover:text-base-content px-3 py-1.5 rounded-md hover:bg-base-200 transition-colors",
                  @portal_loading && "opacity-50 pointer-events-none"
                ]}
              >
                <%= if @portal_loading do %>
                  <span class="loading loading-spinner loading-xs"></span>
                <% else %>
                  Manage
                <% end %>
              </button>
            <% else %>
              <.link href={~p"/pricing"} class="text-xs font-medium text-primary hover:underline">
                Upgrade
              </.link>
            <% end %>
          </div>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("search", %{"search" => search}, socket) do
    socket =
      socket
      |> assign(search_term: search, page: 1)
      |> reload_transcripts()

    {:noreply, socket}
  end

  @impl true
  def handle_event("filter_language", %{"language" => language}, socket) do
    socket =
      socket
      |> assign(language_filter: language, page: 1)
      |> reload_transcripts()

    {:noreply, socket}
  end

  @impl true
  def handle_event("load_more", _params, socket) do
    next_page = socket.assigns.page + 1
    user = socket.assigns.user

    more_transcripts =
      Transcripts.list_user_transcripts(user.id,
        page: next_page,
        per_page: @per_page,
        search: socket.assigns.search_term,
        language: socket.assigns.language_filter
      )

    {:noreply,
     assign(socket,
       transcripts: socket.assigns.transcripts ++ more_transcripts,
       page: next_page
     )}
  end

  @impl true
  def handle_event("manage_billing", _params, socket) do
    user = socket.assigns.user
    socket = assign(socket, portal_loading: true)

    return_url = url(socket, ~p"/dashboard")

    case Subscriptions.create_portal_session(user, return_url) do
      {:ok, session} ->
        {:noreply, redirect(socket, external: session.url)}

      {:error, _reason} ->
        {:noreply,
         socket
         |> assign(portal_loading: false)
         |> put_flash(:error, "Failed to open billing portal. Please try again.")}
    end
  end

  defp reload_transcripts(socket) do
    user = socket.assigns.user

    transcripts =
      Transcripts.list_user_transcripts(user.id,
        page: 1,
        per_page: @per_page,
        search: socket.assigns.search_term,
        language: socket.assigns.language_filter
      )

    assign(socket, transcripts: transcripts)
  end
end
