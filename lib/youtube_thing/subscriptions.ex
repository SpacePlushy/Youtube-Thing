defmodule YoutubeThing.Subscriptions do
  @moduledoc """
  The Subscriptions context handles Stripe billing operations
  including checkout sessions, portal sessions, and customer management.
  """

  alias YoutubeThing.Accounts
  alias YoutubeThing.Accounts.User

  # Plan definitions
  @plans %{
    free: %{
      name: "Free",
      price: 0,
      stripe_price_id: nil,
      transcripts_per_day: 5,
      features: [:basic_transcripts]
    },
    pro: %{
      name: "Pro",
      price: 1000,
      stripe_price_id: {:system, "STRIPE_PRO_PRICE_ID"},
      transcripts_per_day: :unlimited,
      features: [:basic_transcripts, :transcript_history, :unlimited_transcripts, :api_access, :priority_support]
    }
  }

  @doc """
  Returns all plan definitions.
  """
  def list_plans, do: @plans

  @doc """
  Returns the plan definition for the given tier.
  """
  def get_plan(tier) when is_atom(tier), do: Map.get(@plans, tier)

  @doc """
  Returns the Stripe price ID for the given tier.
  """
  def stripe_price_id(:pro), do: System.get_env("STRIPE_PRO_PRICE_ID")
  def stripe_price_id(_), do: nil

  @doc """
  Returns the daily transcript limit for the given tier.
  """
  def transcript_limit(:free), do: 5
  def transcript_limit(:pro), do: :unlimited
  def transcript_limit(_), do: 5

  @doc """
  Returns the daily transcript limit for the given tier.
  Alias for `transcript_limit/1`.
  """
  def get_daily_limit(tier), do: transcript_limit(tier)

  @doc """
  Checks if a tier has access to a given feature.
  """
  def has_feature?(:pro, _feature), do: true
  def has_feature?(:free, :basic_transcripts), do: true
  def has_feature?(_, _), do: false

  @doc """
  Checks if a tier has access to a given feature.
  Alias for `has_feature?/2`.
  """
  def has_feature_access?(tier, feature), do: has_feature?(tier, feature)

  @doc """
  Checks if the given tier can access transcript history (Pro only).
  """
  def can_access_history?(:pro), do: true
  def can_access_history?(_), do: false

  @doc """
  Gets or creates a Stripe customer for the given user.
  If the user already has a stripe_customer_id, returns it.
  Otherwise, creates a new Stripe customer and saves the ID.
  """
  def get_or_create_customer(%User{stripe_customer_id: id} = _user) when is_binary(id) do
    {:ok, id}
  end

  def get_or_create_customer(%User{} = user) do
    case Stripe.Customer.create(%{email: user.email, metadata: %{user_id: user.id}}) do
      {:ok, %Stripe.Customer{id: customer_id}} ->
        case Accounts.update_user_stripe_customer(user, customer_id) do
          {:ok, _user} -> {:ok, customer_id}
          {:error, changeset} -> {:error, changeset}
        end

      {:error, error} ->
        {:error, error}
    end
  end

  @doc """
  Creates a Stripe Checkout session for the given user and price.
  """
  def create_checkout_session(%User{} = user, price_id, return_url) do
    with {:ok, customer_id} <- get_or_create_customer(user) do
      Stripe.Checkout.Session.create(%{
        customer: customer_id,
        mode: :subscription,
        line_items: [%{price: price_id, quantity: 1}],
        success_url: "#{return_url}?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: return_url,
        metadata: %{user_id: user.id}
      })
    end
  end

  @doc """
  Creates a Stripe Billing Portal session for the given user.
  """
  def create_portal_session(%User{} = user, return_url) do
    with {:ok, customer_id} <- get_or_create_customer(user) do
      Stripe.BillingPortal.Session.create(%{
        customer: customer_id,
        return_url: return_url
      })
    end
  end

  @doc """
  Handles a successful checkout by updating the user's subscription.
  """
  def handle_checkout_completed(session) do
    customer_id = session.customer
    subscription_id = session.subscription

    case get_user_by_stripe_customer(customer_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        Accounts.update_user_subscription(user, %{
          subscription_tier: :pro,
          subscription_status: :active,
          subscription_id: subscription_id
        })
    end
  end

  @doc """
  Handles a subscription update event from Stripe.
  """
  def handle_subscription_updated(subscription) do
    case get_user_by_subscription_id(subscription.id) do
      nil ->
        # Try by customer ID as fallback
        case get_user_by_stripe_customer(subscription.customer) do
          nil -> {:error, :user_not_found}
          user -> do_update_subscription(user, subscription)
        end

      user ->
        do_update_subscription(user, subscription)
    end
  end

  @doc """
  Handles a subscription deletion event from Stripe.
  """
  def handle_subscription_deleted(subscription) do
    case get_user_by_subscription_id(subscription.id) do
      nil ->
        case get_user_by_stripe_customer(subscription.customer) do
          nil -> {:error, :user_not_found}
          user -> downgrade_to_free(user)
        end

      user ->
        downgrade_to_free(user)
    end
  end

  @doc """
  Handles invoice payment failure.
  """
  def handle_invoice_payment_failed(invoice) do
    case get_user_by_stripe_customer(invoice.customer) do
      nil ->
        {:error, :user_not_found}

      user ->
        Accounts.update_user_subscription(user, %{subscription_status: :past_due})
    end
  end

  @doc """
  Handles successful invoice payment.
  """
  def handle_invoice_paid(invoice) do
    case get_user_by_stripe_customer(invoice.customer) do
      nil ->
        {:error, :user_not_found}

      user ->
        if user.subscription_status == :past_due do
          Accounts.update_user_subscription(user, %{subscription_status: :active})
        else
          {:ok, user}
        end
    end
  end

  # Private helpers

  defp get_user_by_stripe_customer(customer_id) when is_binary(customer_id) do
    import Ecto.Query
    YoutubeThing.Repo.one(from u in User, where: u.stripe_customer_id == ^customer_id)
  end

  defp get_user_by_stripe_customer(_), do: nil

  defp get_user_by_subscription_id(subscription_id) when is_binary(subscription_id) do
    import Ecto.Query
    YoutubeThing.Repo.one(from u in User, where: u.subscription_id == ^subscription_id)
  end

  defp get_user_by_subscription_id(_), do: nil

  defp do_update_subscription(user, subscription) do
    status = map_stripe_status(subscription.status)
    tier = if status == :active, do: :pro, else: user.subscription_tier

    period_end =
      case subscription.current_period_end do
        ts when is_integer(ts) -> DateTime.from_unix!(ts)
        _ -> nil
      end

    Accounts.update_user_subscription(user, %{
      subscription_tier: tier,
      subscription_status: status,
      subscription_id: subscription.id,
      subscription_period_end: period_end
    })
  end

  defp downgrade_to_free(user) do
    Accounts.update_user_subscription(user, %{
      subscription_tier: :free,
      subscription_status: :inactive,
      subscription_id: nil,
      subscription_period_end: nil
    })
  end

  defp map_stripe_status("active"), do: :active
  defp map_stripe_status("canceled"), do: :canceled
  defp map_stripe_status("past_due"), do: :past_due
  defp map_stripe_status("unpaid"), do: :past_due
  defp map_stripe_status(_), do: :inactive
end
