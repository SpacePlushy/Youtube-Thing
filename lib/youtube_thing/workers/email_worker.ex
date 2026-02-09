defmodule YoutubeThing.Workers.EmailWorker do
  @moduledoc """
  Oban worker for sending emails asynchronously via Swoosh.
  """

  use Oban.Worker, queue: :mailers, max_attempts: 5

  require Logger

  alias YoutubeThing.Mailer

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"email" => email_params}}) do
    email = build_email(email_params)

    case Mailer.deliver(email) do
      {:ok, _} ->
        :ok

      {:error, reason} ->
        Logger.error("[EmailWorker] Failed to deliver email: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp build_email(params) do
    Swoosh.Email.new()
    |> Swoosh.Email.to(params["to"])
    |> Swoosh.Email.from(params["from"] || {"YoutubeThing", "noreply@youtubthing.com"})
    |> Swoosh.Email.subject(params["subject"])
    |> Swoosh.Email.text_body(params["text_body"])
    |> maybe_html_body(params["html_body"])
  end

  defp maybe_html_body(email, nil), do: email
  defp maybe_html_body(email, html), do: Swoosh.Email.html_body(email, html)

  @doc """
  Enqueue an email for async delivery.
  """
  def enqueue(email_params) do
    %{email: email_params}
    |> __MODULE__.new()
    |> Oban.insert()
  end
end
