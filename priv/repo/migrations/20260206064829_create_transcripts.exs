defmodule YoutubeThing.Repo.Migrations.CreateTranscripts do
  use Ecto.Migration

  def change do
    create table(:transcripts) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :video_id, :string, null: false
      add :video_title, :string
      add :channel_name, :string
      add :video_duration, :integer
      add :transcript_text, :text, null: false
      add :language, :string
      add :origin, :string

      timestamps(type: :utc_datetime)
    end

    create index(:transcripts, [:user_id, :inserted_at], comment: "user transcripts ordered by date")
    create index(:transcripts, [:video_id])
  end
end
