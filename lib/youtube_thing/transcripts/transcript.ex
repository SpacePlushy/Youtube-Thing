defmodule YoutubeThing.Transcripts.Transcript do
  use Ecto.Schema
  import Ecto.Changeset

  schema "transcripts" do
    belongs_to :user, YoutubeThing.Accounts.User

    field :video_id, :string
    field :video_title, :string
    field :channel_name, :string
    field :video_duration, :integer
    field :transcript_text, :string
    field :language, :string
    field :origin, Ecto.Enum, values: [:auto_generated, :uploader_provided]

    timestamps(type: :utc_datetime)
  end

  @required_fields [:user_id, :video_id, :transcript_text]
  @optional_fields [:video_title, :channel_name, :video_duration, :language, :origin]

  def changeset(transcript, attrs) do
    transcript
    |> cast(attrs, @required_fields ++ @optional_fields)
    |> validate_required(@required_fields)
    |> foreign_key_constraint(:user_id)
  end
end
