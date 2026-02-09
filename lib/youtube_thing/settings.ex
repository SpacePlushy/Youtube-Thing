defmodule YoutubeThing.Settings do
  @moduledoc """
  The Settings context.
  """

  import Ecto.Query, warn: false
  alias YoutubeThing.Repo
  alias YoutubeThing.Settings.UserSettings

  @doc """
  Gets settings for a user, auto-creating defaults if none exist.
  """
  def get_settings(user_id) do
    case Repo.get_by(UserSettings, user_id: user_id) do
      nil -> create_default_settings(user_id)
      settings -> {:ok, settings}
    end
  end

  @doc """
  Gets raw settings without auto-creation. Returns nil if no settings exist.
  """
  def get_user_settings(user_id) do
    Repo.get_by(UserSettings, user_id: user_id)
  end

  @doc """
  Creates default settings for a user.
  """
  def create_default_settings(user_id) do
    %UserSettings{user_id: user_id}
    |> UserSettings.changeset(%{})
    |> Repo.insert()
  end

  @doc """
  Updates existing settings.
  """
  def update_settings(%UserSettings{} = settings, attrs) do
    settings
    |> UserSettings.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Creates or updates settings for the given user.
  """
  def create_or_update_settings(user_id, attrs) do
    case get_user_settings(user_id) do
      nil ->
        %UserSettings{user_id: user_id}
        |> UserSettings.changeset(attrs)
        |> Repo.insert()

      settings ->
        settings
        |> UserSettings.changeset(attrs)
        |> Repo.update()
    end
  end

  @doc """
  Returns a changeset for LiveView forms.
  """
  def change_settings(%UserSettings{} = settings, attrs \\ %{}) do
    UserSettings.changeset(settings, attrs)
  end
end
