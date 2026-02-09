defmodule YoutubeThingWeb.SettingsLive do
  use YoutubeThingWeb, :live_view

  alias YoutubeThing.Settings

  @impl true
  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user
    {:ok, settings} = Settings.get_settings(user.id)
    changeset = Settings.change_settings(settings)

    {:ok,
     assign(socket,
       page_title: "Settings",
       user: user,
       settings: settings,
       form: to_form(changeset),
       saved: false
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-[calc(100vh-3.5rem)]">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <!-- Header -->
        <div class="mb-10 stagger-in">
          <h1 class="text-xl sm:text-2xl font-bold text-base-content tracking-tight mb-1">Settings</h1>
          <p class="text-sm text-base-content/40">Manage your preferences and account</p>
        </div>

        <div class="space-y-4">
          <!-- Preferences -->
          <div class="yt-card overflow-hidden stagger-in" style="animation-delay: 100ms">
            <div class="px-5 py-3 border-b border-base-300 flex items-center gap-2.5">
              <div class="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <.icon name="hero-adjustments-horizontal" class="size-3 text-primary" />
              </div>
              <span class="text-sm font-medium text-base-content">Preferences</span>
            </div>

            <div class="p-5">
              <.form for={@form} phx-change="validate" phx-submit="save" class="space-y-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-base-content/40 uppercase tracking-wider mb-2">
                      Export Format
                    </label>
                    <select
                      name={@form[:default_export_format].name}
                      class="w-full px-3 py-2 rounded-md bg-base-200 border border-base-300 text-sm text-base-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    >
                      <option value="txt" selected={@form[:default_export_format].value == "txt"}>
                        Plain Text (.txt)
                      </option>
                      <option value="srt" selected={@form[:default_export_format].value == "srt"}>
                        SubRip Subtitle (.srt)
                      </option>
                      <option value="vtt" selected={@form[:default_export_format].value == "vtt"}>
                        WebVTT (.vtt)
                      </option>
                      <option value="json" selected={@form[:default_export_format].value == "json"}>
                        JSON (.json)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-base-content/40 uppercase tracking-wider mb-2">
                      Language
                    </label>
                    <select
                      name={@form[:default_language].name}
                      class="w-full px-3 py-2 rounded-md bg-base-200 border border-base-300 text-sm text-base-content focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                    >
                      <%= for {label, value} <- supported_languages() do %>
                        <option value={value} selected={@form[:default_language].value == value}>
                          {label}
                        </option>
                      <% end %>
                    </select>
                  </div>
                </div>

                <div class="pt-2 border-t border-base-300/50">
                  <label class="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      name={@form[:email_notifications].name}
                      value="true"
                      checked={@form[:email_notifications].value == true or @form[:email_notifications].value == "true"}
                      class="checkbox checkbox-primary checkbox-sm mt-0.5"
                    />
                    <div>
                      <span class="text-sm font-medium text-base-content group-hover:text-primary transition-colors">
                        Email Notifications
                      </span>
                      <p class="text-xs text-base-content/35 mt-0.5">
                        Receive updates about your account and transcripts
                      </p>
                    </div>
                  </label>
                </div>

                <input type="hidden" name={@form[:email_notifications].name} value="false" />

                <div class="flex items-center gap-3 pt-1">
                  <button type="submit" class="btn btn-primary btn-sm text-xs font-medium h-8 min-h-0 px-4">
                    Save Changes
                  </button>
                  <span
                    :if={@saved}
                    class="text-xs text-primary flex items-center gap-1 fade-in"
                  >
                    <.icon name="hero-check" class="size-3.5" />
                    Saved
                  </span>
                </div>
              </.form>
            </div>
          </div>

          <!-- Account -->
          <div class="yt-card overflow-hidden stagger-in" style="animation-delay: 200ms">
            <div class="px-5 py-3 border-b border-base-300 flex items-center gap-2.5">
              <div class="w-6 h-6 rounded bg-base-200 flex items-center justify-center">
                <.icon name="hero-user" class="size-3 text-base-content/50" />
              </div>
              <span class="text-sm font-medium text-base-content">Account</span>
            </div>

            <div class="p-5">
              <div class="space-y-3">
                <div class="flex items-center justify-between py-1">
                  <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider">Email</span>
                  <span class="text-sm font-mono text-base-content">{@user.email}</span>
                </div>
                <div class="flex items-center justify-between py-1">
                  <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider">Plan</span>
                  <span class={[
                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                    @user.subscription_tier == :pro && "bg-primary/10 text-primary border border-primary/20",
                    @user.subscription_tier != :pro && "bg-base-200 text-base-content/50"
                  ]}>
                    {to_string(@user.subscription_tier || "free")}
                  </span>
                </div>
              </div>

              <div class="h-px bg-base-300/50 my-4"></div>

              <.link
                href={~p"/users/settings"}
                class="inline-flex items-center gap-1.5 text-xs text-base-content/50 hover:text-primary transition-colors"
              >
                <.icon name="hero-cog-6-tooth" class="size-3" />
                Change email or password
              </.link>
            </div>
          </div>
        </div>
      </div>
    </div>
    """
  end

  @impl true
  def handle_event("validate", params, socket) do
    settings_params = extract_settings_params(params)
    changeset = Settings.change_settings(socket.assigns.settings, settings_params)
    {:noreply, assign(socket, form: to_form(changeset, action: :validate), saved: false)}
  end

  @impl true
  def handle_event("save", params, socket) do
    settings_params = extract_settings_params(params)

    case Settings.update_settings(socket.assigns.settings, settings_params) do
      {:ok, settings} ->
        changeset = Settings.change_settings(settings)

        {:noreply,
         assign(socket,
           settings: settings,
           form: to_form(changeset),
           saved: true
         )}

      {:error, changeset} ->
        {:noreply, assign(socket, form: to_form(changeset, action: :insert))}
    end
  end

  defp extract_settings_params(params) do
    email_notifications =
      case params["email_notifications"] do
        "true" -> true
        ["false", "true"] -> true
        _ -> false
      end

    %{
      "default_export_format" => params["default_export_format"],
      "default_language" => params["default_language"],
      "email_notifications" => email_notifications
    }
  end

end
