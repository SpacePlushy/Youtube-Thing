defmodule YoutubeThingWeb.OAuthController do
  use YoutubeThingWeb, :controller

  plug Ueberauth

  alias YoutubeThing.Accounts
  alias YoutubeThingWeb.UserAuth

  def callback(%{assigns: %{ueberauth_failure: failure}} = conn, _params) do
    conn
    |> put_flash(:error, "Authentication failed: #{inspect(failure.errors)}")
    |> redirect(to: ~p"/users/log-in")
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case Accounts.find_or_create_user_from_oauth(auth) do
      {:ok, user} ->
        conn
        |> put_flash(:info, "Welcome!")
        |> UserAuth.log_in_user(user)

      {:error, _reason} ->
        conn
        |> put_flash(:error, "Something went wrong. Please try again.")
        |> redirect(to: ~p"/users/log-in")
    end
  end
end
