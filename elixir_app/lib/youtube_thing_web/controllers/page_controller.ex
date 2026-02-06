defmodule YoutubeThingWeb.PageController do
  use YoutubeThingWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
