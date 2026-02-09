defmodule YoutubeThingWeb.UserSessionHTML do
  use YoutubeThingWeb, :html

  embed_templates "user_session_html/*"

  defp local_mail_adapter? do
    Application.get_env(:youtube_thing, YoutubeThing.Mailer)[:adapter] == Swoosh.Adapters.Local
  end
end
