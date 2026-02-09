defmodule YoutubeThing.Settings.UserSettings do
  use Ecto.Schema
  import Ecto.Changeset

  schema "user_settings" do
    belongs_to :user, YoutubeThing.Accounts.User

    field :default_export_format, :string, default: "txt"
    field :email_notifications, :boolean, default: true
    field :default_language, :string, default: "en"

    timestamps(type: :utc_datetime)
  end

  @fields [:default_export_format, :email_notifications, :default_language]
  @valid_export_formats ~w(txt srt vtt json)
  @valid_languages ~w(en es fr de it pt ru ja ko zh ar hi)

  def changeset(user_settings, attrs) do
    user_settings
    |> cast(attrs, @fields)
    |> validate_inclusion(:default_export_format, @valid_export_formats)
    |> validate_inclusion(:default_language, @valid_languages)
    |> unique_constraint(:user_id)
  end
end
