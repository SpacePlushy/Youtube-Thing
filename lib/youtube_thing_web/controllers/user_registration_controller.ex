defmodule YoutubeThingWeb.UserRegistrationController do
  use YoutubeThingWeb, :controller

  require Logger

  alias YoutubeThing.Accounts
  alias YoutubeThing.Accounts.User
  alias YoutubeThing.Subscriptions

  def new(conn, _params) do
    changeset = Accounts.change_user_email(%User{})
    render(conn, :new, changeset: changeset)
  end

  def create(conn, %{"user" => user_params}) do
    case Accounts.register_user(user_params) do
      {:ok, user} ->
        create_stripe_customer_async(user)

        {:ok, _} =
          Accounts.deliver_login_instructions(
            user,
            &url(~p"/users/log-in/#{&1}")
          )

        conn
        |> put_flash(
          :info,
          "An email was sent to #{user.email}, please access it to confirm your account."
        )
        |> redirect(to: ~p"/users/log-in")

      {:error, %Ecto.Changeset{} = changeset} ->
        render(conn, :new, changeset: changeset)
    end
  end

  defp create_stripe_customer_async(user) do
    Task.start(fn ->
      case Subscriptions.get_or_create_customer(user) do
        {:ok, _customer_id} ->
          Logger.info("Created Stripe customer for user #{user.id}")

        {:error, reason} ->
          Logger.warning("Failed to create Stripe customer for user #{user.id}: #{inspect(reason)}")
      end
    end)
  end
end
