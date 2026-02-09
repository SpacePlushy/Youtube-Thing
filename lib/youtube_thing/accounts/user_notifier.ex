defmodule YoutubeThing.Accounts.UserNotifier do
  import Swoosh.Email

  alias YoutubeThing.Mailer
  alias YoutubeThing.Accounts.User

  @from_name "YoutubeThing"

  defp from_address do
    System.get_env("MAIL_FROM_ADDRESS") || "noreply@example.com"
  end

  defp base_html(inner_html) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f7;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 600px; width: 100%;">
              <tr>
                <td style="padding: 40px 48px 24px; text-align: center;">
                  <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a2e;">YoutubeThing</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 0 48px 40px;">
                  #{inner_html}
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 48px; border-top: 1px solid #eaeaea; text-align: center;">
                  <p style="margin: 0; font-size: 13px; color: #999999;">
                    This email was sent by YoutubeThing. If you did not expect this email, you can safely ignore it.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """
  end

  defp action_button(url, label) do
    """
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="#{url}" style="display: inline-block; padding: 14px 32px; background-color: #6366f1; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 6px;">#{label}</a>
        </td>
      </tr>
    </table>
    """
  end

  # Delivers the email using the application mailer.
  defp deliver(recipient, subject, text_body, html_body) do
    email =
      new()
      |> to(recipient)
      |> from({@from_name, from_address()})
      |> subject(subject)
      |> text_body(text_body)
      |> html_body(html_body)

    with {:ok, _metadata} <- Mailer.deliver(email) do
      {:ok, email}
    end
  end

  @doc """
  Deliver instructions to update a user email.
  """
  def deliver_update_email_instructions(user, url) do
    text = """

    ==============================

    Hi #{user.email},

    You can change your email by visiting the URL below:

    #{url}

    If you didn't request this change, please ignore this.

    ==============================
    """

    html =
      base_html("""
      <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">Hi #{user.email},</p>
      <p style="margin: 0 0 8px; font-size: 16px; color: #333333;">You requested to change your email address. Click the button below to confirm:</p>
      #{action_button(url, "Update Email")}
      <p style="margin: 0; font-size: 14px; color: #666666;">If you didn't request this change, please ignore this email.</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #999999; word-break: break-all;">Or copy this link: #{url}</p>
      """)

    deliver(user.email, "Update email instructions", text, html)
  end

  @doc """
  Deliver instructions to log in with a magic link.
  """
  def deliver_login_instructions(user, url) do
    case user do
      %User{confirmed_at: nil} -> deliver_confirmation_instructions(user, url)
      _ -> deliver_magic_link_instructions(user, url)
    end
  end

  defp deliver_magic_link_instructions(user, url) do
    text = """

    ==============================

    Hi #{user.email},

    You can log into your account by visiting the URL below:

    #{url}

    If you didn't request this email, please ignore this.

    ==============================
    """

    html =
      base_html("""
      <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">Hi #{user.email},</p>
      <p style="margin: 0 0 8px; font-size: 16px; color: #333333;">Click the button below to log into your account:</p>
      #{action_button(url, "Log In")}
      <p style="margin: 0; font-size: 14px; color: #666666;">If you didn't request this email, please ignore it.</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #999999;">This link expires in 15 minutes.</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #999999; word-break: break-all;">Or copy this link: #{url}</p>
      """)

    deliver(user.email, "Log in instructions", text, html)
  end

  defp deliver_confirmation_instructions(user, url) do
    text = """

    ==============================

    Hi #{user.email},

    You can confirm your account by visiting the URL below:

    #{url}

    If you didn't create an account with us, please ignore this.

    ==============================
    """

    html =
      base_html("""
      <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">Hi #{user.email},</p>
      <p style="margin: 0 0 8px; font-size: 16px; color: #333333;">Welcome to YoutubeThing! Please confirm your account by clicking the button below:</p>
      #{action_button(url, "Confirm Account")}
      <p style="margin: 0; font-size: 14px; color: #666666;">If you didn't create an account with us, please ignore this email.</p>
      <p style="margin: 16px 0 0; font-size: 13px; color: #999999; word-break: break-all;">Or copy this link: #{url}</p>
      """)

    deliver(user.email, "Confirmation instructions", text, html)
  end
end
