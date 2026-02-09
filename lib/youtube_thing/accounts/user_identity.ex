defmodule YoutubeThing.Accounts.UserIdentity do
  use Ecto.Schema
  import Ecto.Changeset

  schema "user_identities" do
    belongs_to :user, YoutubeThing.Accounts.User
    field :provider, :string
    field :uid, :string
    field :email, :string
    field :name, :string
    field :avatar_url, :string
    field :token, :string
    field :refresh_token, :string
    field :token_expires_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  def changeset(identity, attrs) do
    identity
    |> cast(attrs, [:provider, :uid, :email, :name, :avatar_url, :token, :refresh_token, :token_expires_at])
    |> validate_required([:provider, :uid])
    |> unique_constraint([:provider, :uid])
    |> foreign_key_constraint(:user_id)
  end
end
