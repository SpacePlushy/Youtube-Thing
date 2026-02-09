defmodule YoutubeThing.Repo.Migrations.CreateUserSettings do
  use Ecto.Migration

  def change do
    create table(:user_settings) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :default_export_format, :string, default: "txt", null: false
      add :email_notifications, :boolean, default: true, null: false
      add :default_language, :string, default: "en", null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:user_settings, [:user_id])
  end
end
