defmodule YoutubeThing.Repo do
  use Ecto.Repo,
    otp_app: :youtube_thing,
    adapter: Ecto.Adapters.Postgres
end
