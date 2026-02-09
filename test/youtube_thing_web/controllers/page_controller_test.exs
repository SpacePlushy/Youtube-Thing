defmodule YoutubeThingWeb.PageControllerTest do
  use YoutubeThingWeb.ConnCase

  test "GET /", %{conn: conn} do
    conn = get(conn, ~p"/")
    assert html_response(conn, 200) =~ "YouTube Transcript"
  end
end
