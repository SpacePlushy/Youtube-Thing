defmodule YoutubeThingWeb.StripeWebhookController do
  use YoutubeThingWeb, :controller

  require Logger

  alias YoutubeThing.Subscriptions

  @doc """
  Handles incoming Stripe webhook events.

  Verifies the webhook signature using the raw request body,
  then dispatches to the appropriate handler based on event type.
  """
  def create(conn, _params) do
    raw_body = YoutubeThingWeb.CacheBodyReader.get_raw_body(conn)
    signature = get_stripe_signature(conn)
    webhook_secret = System.get_env("STRIPE_WEBHOOK_SECRET")

    case Stripe.Webhook.construct_event(raw_body, signature, webhook_secret) do
      {:ok, %Stripe.Event{} = event} ->
        handle_event(event)
        conn |> send_resp(200, "ok")

      {:error, reason} ->
        Logger.warning("Stripe webhook verification failed: #{inspect(reason)}")
        conn |> send_resp(400, "webhook verification failed")
    end
  end

  defp get_stripe_signature(conn) do
    case Plug.Conn.get_req_header(conn, "stripe-signature") do
      [signature | _] -> signature
      _ -> ""
    end
  end

  defp handle_event(%Stripe.Event{type: "checkout.session.completed", data: %{object: session}}) do
    Logger.info("Processing checkout.session.completed for customer #{session.customer}")

    case Subscriptions.handle_checkout_completed(session) do
      {:ok, _user} -> :ok
      {:error, reason} -> Logger.error("Failed to handle checkout: #{inspect(reason)}")
    end
  end

  defp handle_event(%Stripe.Event{type: "customer.subscription.updated", data: %{object: subscription}}) do
    Logger.info("Processing customer.subscription.updated for #{subscription.id}")

    case Subscriptions.handle_subscription_updated(subscription) do
      {:ok, _user} -> :ok
      {:error, reason} -> Logger.error("Failed to handle subscription update: #{inspect(reason)}")
    end
  end

  defp handle_event(%Stripe.Event{type: "customer.subscription.deleted", data: %{object: subscription}}) do
    Logger.info("Processing customer.subscription.deleted for #{subscription.id}")

    case Subscriptions.handle_subscription_deleted(subscription) do
      {:ok, _user} -> :ok
      {:error, reason} -> Logger.error("Failed to handle subscription deletion: #{inspect(reason)}")
    end
  end

  defp handle_event(%Stripe.Event{type: "invoice.payment_failed", data: %{object: invoice}}) do
    Logger.info("Processing invoice.payment_failed for customer #{invoice.customer}")

    case Subscriptions.handle_invoice_payment_failed(invoice) do
      {:ok, _user} -> :ok
      {:error, reason} -> Logger.error("Failed to handle payment failure: #{inspect(reason)}")
    end
  end

  defp handle_event(%Stripe.Event{type: "invoice.paid", data: %{object: invoice}}) do
    Logger.info("Processing invoice.paid for customer #{invoice.customer}")

    case Subscriptions.handle_invoice_paid(invoice) do
      {:ok, _user} -> :ok
      {:error, reason} -> Logger.error("Failed to handle invoice paid: #{inspect(reason)}")
    end
  end

  defp handle_event(%Stripe.Event{type: type}) do
    Logger.debug("Unhandled Stripe webhook event: #{type}")
    :ok
  end
end
