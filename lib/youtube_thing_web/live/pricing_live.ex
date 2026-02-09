defmodule YoutubeThingWeb.PricingLive do
  use YoutubeThingWeb, :live_view

  alias YoutubeThing.Subscriptions

  @impl true
  def mount(_params, _session, socket) do
    user = get_user(socket)
    tier = if user, do: user.subscription_tier || :free, else: nil

    {:ok,
     assign(socket,
       page_title: "Pricing",
       user: user,
       tier: tier,
       checkout_loading: false
     )}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-[calc(100vh-3.5rem)]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-16">
        <!-- Header -->
        <div class="text-center mb-14 stagger-in">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/8 border border-primary/15 mb-6">
            <div class="w-1.5 h-1.5 rounded-full bg-primary"></div>
            <span class="text-xs font-medium text-primary tracking-wide uppercase">Pricing</span>
          </div>
          <h1 class="text-3xl sm:text-4xl font-bold text-base-content tracking-tight mb-3">
            Simple, transparent pricing
          </h1>
          <p class="text-base-content/40 text-sm sm:text-base max-w-md mx-auto">
            Start free, upgrade when you need more. Cancel anytime.
          </p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          <!-- Free Plan -->
          <div class="yt-card p-6 sm:p-8 stagger-in" style="animation-delay: 100ms">
            <div class="mb-6">
              <span class="text-xs font-medium text-base-content/40 uppercase tracking-wider">Free</span>
              <div class="flex items-baseline gap-1 mt-2">
                <span class="text-4xl font-bold font-mono text-base-content">$0</span>
                <span class="text-sm text-base-content/30">/mo</span>
              </div>
              <p class="text-sm text-base-content/40 mt-2">Perfect for getting started</p>
            </div>

            <ul class="space-y-3 mb-8">
              <.plan_feature text="5 transcripts per day" />
              <.plan_feature text="Copy & download" />
              <.plan_feature text="12+ languages" />
              <.plan_feature text="TXT, SRT, VTT, JSON" />
              <.plan_feature text="Transcript history" excluded />
              <.plan_feature text="Priority support" excluded />
            </ul>

            <%= if @user do %>
              <%= if @tier == :free do %>
                <div class="w-full py-2.5 text-center text-xs font-medium text-base-content/40 bg-base-200 rounded-md border border-base-300">
                  Current Plan
                </div>
              <% else %>
                <div class="w-full py-2.5 text-center text-xs font-medium text-base-content/40 bg-base-200 rounded-md border border-base-300">
                  Included
                </div>
              <% end %>
            <% else %>
              <.link
                href={~p"/users/register"}
                class="block w-full py-2.5 text-center text-sm font-medium text-base-content/70 bg-base-200 hover:bg-base-300 rounded-md border border-base-300 transition-colors"
              >
                Get Started
              </.link>
            <% end %>
          </div>

          <!-- Pro Plan -->
          <div class="yt-card p-6 sm:p-8 relative border-primary/30 stagger-in" style="animation-delay: 150ms">
            <div class="absolute -top-2.5 left-6">
              <span class="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 bg-primary text-primary-content rounded-full">
                Popular
              </span>
            </div>

            <div class="mb-6">
              <span class="text-xs font-medium text-primary uppercase tracking-wider">Pro</span>
              <div class="flex items-baseline gap-1 mt-2">
                <span class="text-4xl font-bold font-mono text-base-content">$10</span>
                <span class="text-sm text-base-content/30">/mo</span>
              </div>
              <p class="text-sm text-base-content/40 mt-2">For power users</p>
            </div>

            <ul class="space-y-3 mb-8">
              <.plan_feature text="Unlimited transcripts" />
              <.plan_feature text="Copy & download" />
              <.plan_feature text="12+ languages" />
              <.plan_feature text="TXT, SRT, VTT, JSON" />
              <.plan_feature text="Unlimited history" />
              <.plan_feature text="Priority support" />
            </ul>

            <%= if @user && @tier == :pro do %>
              <div class="w-full py-2.5 text-center text-xs font-medium text-primary bg-primary/8 rounded-md border border-primary/20">
                Current Plan
              </div>
            <% else %>
              <button
                phx-click="upgrade"
                disabled={@checkout_loading}
                class={[
                  "btn btn-primary w-full text-sm font-medium h-10 min-h-0",
                  @checkout_loading && "btn-disabled"
                ]}
              >
                <%= if @checkout_loading do %>
                  <span class="loading loading-spinner loading-xs"></span>
                <% else %>
                  Upgrade to Pro
                <% end %>
              </button>
            <% end %>
          </div>
        </div>

        <!-- Comparison Table -->
        <div class="yt-card overflow-hidden max-w-3xl mx-auto mb-12 stagger-in" style="animation-delay: 250ms">
          <div class="px-5 py-3 border-b border-base-300 flex items-center gap-2.5">
            <div class="w-6 h-6 rounded bg-base-200 flex items-center justify-center">
              <.icon name="hero-table-cells" class="size-3 text-base-content/50" />
            </div>
            <span class="text-sm font-medium text-base-content">Compare plans</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-base-300">
                  <th class="text-left text-xs font-medium text-base-content/35 uppercase tracking-wider px-5 py-3">Feature</th>
                  <th class="text-center text-xs font-medium text-base-content/35 uppercase tracking-wider px-5 py-3 w-28">Free</th>
                  <th class="text-center text-xs font-medium text-primary uppercase tracking-wider px-5 py-3 w-28">Pro</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-base-300/50">
                  <td class="text-sm text-base-content/70 px-5 py-3">Daily Transcripts</td>
                  <td class="text-center text-sm text-base-content/50 font-mono px-5 py-3">5</td>
                  <td class="text-center text-sm text-primary font-medium px-5 py-3">Unlimited</td>
                </tr>
                <tr class="border-b border-base-300/50">
                  <td class="text-sm text-base-content/70 px-5 py-3">Transcript History</td>
                  <td class="text-center px-5 py-3">
                    <.icon name="hero-x-mark" class="size-3.5 text-base-content/20 mx-auto" />
                  </td>
                  <td class="text-center text-sm text-primary font-medium px-5 py-3">Unlimited</td>
                </tr>
                <tr class="border-b border-base-300/50">
                  <td class="text-sm text-base-content/70 px-5 py-3">Languages</td>
                  <td class="text-center text-sm text-base-content/50 font-mono px-5 py-3">12+</td>
                  <td class="text-center text-sm text-base-content/50 font-mono px-5 py-3">12+</td>
                </tr>
                <tr class="border-b border-base-300/50">
                  <td class="text-sm text-base-content/70 px-5 py-3">Export Formats</td>
                  <td class="text-center px-5 py-3">
                    <.icon name="hero-check" class="size-3.5 text-primary mx-auto" />
                  </td>
                  <td class="text-center px-5 py-3">
                    <.icon name="hero-check" class="size-3.5 text-primary mx-auto" />
                  </td>
                </tr>
                <tr>
                  <td class="text-sm text-base-content/70 px-5 py-3">Support</td>
                  <td class="text-center text-sm text-base-content/40 px-5 py-3">Community</td>
                  <td class="text-center text-sm text-base-content/50 px-5 py-3">Priority</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Help -->
        <div class="text-center stagger-in" style="animation-delay: 350ms">
          <p class="text-sm text-base-content/35 mb-4">
            Questions? We're here to help.
          </p>
          <a href="mailto:support@transcripty.io" class="text-sm text-primary hover:underline">
            support@transcripty.io
          </a>
        </div>
      </div>
    </div>
    """
  end

  attr :text, :string, required: true
  attr :excluded, :boolean, default: false

  defp plan_feature(assigns) do
    ~H"""
    <li class="flex items-center gap-2.5">
      <%= if @excluded do %>
        <div class="w-4 h-4 rounded-full bg-base-200 flex items-center justify-center shrink-0">
          <.icon name="hero-x-mark" class="size-2 text-base-content/20" />
        </div>
        <span class="text-sm text-base-content/30">{@text}</span>
      <% else %>
        <div class="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <.icon name="hero-check" class="size-2.5 text-primary" />
        </div>
        <span class="text-sm text-base-content/70">{@text}</span>
      <% end %>
    </li>
    """
  end

  @impl true
  def handle_event("upgrade", _params, socket) do
    user = socket.assigns.user

    if is_nil(user) do
      {:noreply, redirect(socket, to: ~p"/users/log-in")}
    else
      socket = assign(socket, checkout_loading: true)

      price_id = Subscriptions.stripe_price_id(:pro)
      return_url = url(socket, ~p"/pricing")

      case Subscriptions.create_checkout_session(user, price_id, return_url) do
        {:ok, session} ->
          {:noreply, redirect(socket, external: session.url)}

        {:error, _reason} ->
          {:noreply,
           socket
           |> assign(checkout_loading: false)
           |> put_flash(:error, "Failed to create checkout session. Please try again.")}
      end
    end
  end

  defp get_user(socket) do
    case socket.assigns do
      %{current_scope: %{user: %{id: _} = user}} -> user
      _ -> nil
    end
  end
end
