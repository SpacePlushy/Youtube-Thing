defmodule YoutubeThing.Accounts do
  @moduledoc """
  The Accounts context.
  """

  import Ecto.Query, warn: false
  alias YoutubeThing.Repo

  alias YoutubeThing.Accounts.{User, UserIdentity, UserToken, UserNotifier}

  ## Database getters

  @doc """
  Gets a user by email.

  ## Examples

      iex> get_user_by_email("foo@example.com")
      %User{}

      iex> get_user_by_email("unknown@example.com")
      nil

  """
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: email)
  end

  @doc """
  Gets a user by email and password.

  ## Examples

      iex> get_user_by_email_and_password("foo@example.com", "correct_password")
      %User{}

      iex> get_user_by_email_and_password("foo@example.com", "invalid_password")
      nil

  """
  def get_user_by_email_and_password(email, password)
      when is_binary(email) and is_binary(password) do
    user = Repo.get_by(User, email: email)
    if User.valid_password?(user, password), do: user
  end

  @doc """
  Gets a single user.

  Raises `Ecto.NoResultsError` if the User does not exist.

  ## Examples

      iex> get_user!(123)
      %User{}

      iex> get_user!(456)
      ** (Ecto.NoResultsError)

  """
  def get_user!(id), do: Repo.get!(User, id)

  ## User registration

  @doc """
  Registers a user.

  ## Examples

      iex> register_user(%{field: value})
      {:ok, %User{}}

      iex> register_user(%{field: bad_value})
      {:error, %Ecto.Changeset{}}

  """
  def register_user(attrs) do
    with {:ok, user} <- %User{} |> User.email_changeset(attrs) |> Repo.insert() do
      # Best-effort Stripe customer creation; don't fail registration if Stripe is down
      case YoutubeThing.Subscriptions.get_or_create_customer(user) do
        {:ok, _customer_id} -> :ok
        {:error, _reason} -> :ok
      end

      {:ok, user}
    end
  end

  ## Settings

  @doc """
  Checks whether the user is in sudo mode.

  The user is in sudo mode when the last authentication was done no further
  than 20 minutes ago. The limit can be given as second argument in minutes.
  """
  def sudo_mode?(user, minutes \\ -20)

  def sudo_mode?(%User{authenticated_at: ts}, minutes) when is_struct(ts, DateTime) do
    DateTime.after?(ts, DateTime.utc_now() |> DateTime.add(minutes, :minute))
  end

  def sudo_mode?(_user, _minutes), do: false

  @doc """
  Returns an `%Ecto.Changeset{}` for changing the user email.

  See `YoutubeThing.Accounts.User.email_changeset/3` for a list of supported options.

  ## Examples

      iex> change_user_email(user)
      %Ecto.Changeset{data: %User{}}

  """
  def change_user_email(user, attrs \\ %{}, opts \\ []) do
    User.email_changeset(user, attrs, opts)
  end

  @doc """
  Updates the user email using the given token.

  If the token matches, the user email is updated and the token is deleted.
  """
  def update_user_email(user, token) do
    context = "change:#{user.email}"

    Repo.transact(fn ->
      with {:ok, query} <- UserToken.verify_change_email_token_query(token, context),
           %UserToken{sent_to: email} <- Repo.one(query),
           {:ok, user} <- Repo.update(User.email_changeset(user, %{email: email})),
           {_count, _result} <-
             Repo.delete_all(from(UserToken, where: [user_id: ^user.id, context: ^context])) do
        {:ok, user}
      else
        _ -> {:error, :transaction_aborted}
      end
    end)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for changing the user password.

  See `YoutubeThing.Accounts.User.password_changeset/3` for a list of supported options.

  ## Examples

      iex> change_user_password(user)
      %Ecto.Changeset{data: %User{}}

  """
  def change_user_password(user, attrs \\ %{}, opts \\ []) do
    User.password_changeset(user, attrs, opts)
  end

  @doc """
  Updates the user password.

  Returns a tuple with the updated user, as well as a list of expired tokens.

  ## Examples

      iex> update_user_password(user, %{password: ...})
      {:ok, {%User{}, [...]}}

      iex> update_user_password(user, %{password: "too short"})
      {:error, %Ecto.Changeset{}}

  """
  def update_user_password(user, attrs) do
    user
    |> User.password_changeset(attrs)
    |> update_user_and_delete_all_tokens()
  end

  ## Session

  @doc """
  Generates a session token.
  """
  def generate_user_session_token(user) do
    {token, user_token} = UserToken.build_session_token(user)
    Repo.insert!(user_token)
    token
  end

  @doc """
  Gets the user with the given signed token.

  If the token is valid `{user, token_inserted_at}` is returned, otherwise `nil` is returned.
  """
  def get_user_by_session_token(token) do
    {:ok, query} = UserToken.verify_session_token_query(token)
    Repo.one(query)
  end

  @doc """
  Gets the user with the given magic link token.
  """
  def get_user_by_magic_link_token(token) do
    with {:ok, query} <- UserToken.verify_magic_link_token_query(token),
         {user, _token} <- Repo.one(query) do
      user
    else
      _ -> nil
    end
  end

  @doc """
  Logs the user in by magic link.

  There are three cases to consider:

  1. The user has already confirmed their email. They are logged in
     and the magic link is expired.

  2. The user has not confirmed their email and no password is set.
     In this case, the user gets confirmed, logged in, and all tokens -
     including session ones - are expired. In theory, no other tokens
     exist but we delete all of them for best security practices.

  3. The user has not confirmed their email but a password is set.
     This cannot happen in the default implementation but may be the
     source of security pitfalls. See the "Mixing magic link and password registration" section of
     `mix help phx.gen.auth`.
  """
  def login_user_by_magic_link(token) do
    {:ok, query} = UserToken.verify_magic_link_token_query(token)

    case Repo.one(query) do
      # Prevent session fixation attacks by disallowing magic links for unconfirmed users with password
      {%User{confirmed_at: nil, hashed_password: hash}, _token} when not is_nil(hash) ->
        raise """
        magic link log in is not allowed for unconfirmed users with a password set!

        This cannot happen with the default implementation, which indicates that you
        might have adapted the code to a different use case. Please make sure to read the
        "Mixing magic link and password registration" section of `mix help phx.gen.auth`.
        """

      {%User{confirmed_at: nil} = user, _token} ->
        user
        |> User.confirm_changeset()
        |> update_user_and_delete_all_tokens()

      {user, token} ->
        Repo.delete!(token)
        {:ok, {user, []}}

      nil ->
        {:error, :not_found}
    end
  end

  @doc ~S"""
  Delivers the update email instructions to the given user.

  ## Examples

      iex> deliver_user_update_email_instructions(user, current_email, &url(~p"/users/settings/confirm-email/#{&1}"))
      {:ok, %{to: ..., body: ...}}

  """
  def deliver_user_update_email_instructions(%User{} = user, current_email, update_email_url_fun)
      when is_function(update_email_url_fun, 1) do
    {encoded_token, user_token} = UserToken.build_email_token(user, "change:#{current_email}")

    Repo.insert!(user_token)
    UserNotifier.deliver_update_email_instructions(user, update_email_url_fun.(encoded_token))
  end

  @doc """
  Delivers the magic link login instructions to the given user.
  """
  def deliver_login_instructions(%User{} = user, magic_link_url_fun)
      when is_function(magic_link_url_fun, 1) do
    {encoded_token, user_token} = UserToken.build_email_token(user, "login")
    Repo.insert!(user_token)
    UserNotifier.deliver_login_instructions(user, magic_link_url_fun.(encoded_token))
  end

  @doc """
  Deletes the signed token with the given context.
  """
  def delete_user_session_token(token) do
    Repo.delete_all(from(UserToken, where: [token: ^token, context: "session"]))
    :ok
  end

  ## Subscriptions

  @doc """
  Returns the subscription tier for a user.
  """
  def get_user_subscription_tier(%User{} = user) do
    user.subscription_tier
  end

  @doc """
  Updates the user's Stripe customer ID.
  """
  def update_user_stripe_customer(%User{} = user, stripe_customer_id) do
    user
    |> User.subscription_changeset(%{stripe_customer_id: stripe_customer_id})
    |> Repo.update()
  end

  @doc """
  Updates the user's subscription fields.
  """
  def update_user_subscription(%User{} = user, attrs) do
    user
    |> User.subscription_changeset(attrs)
    |> Repo.update()
  end

  ## OAuth

  @doc """
  Finds or creates a user from an OAuth provider callback.

  Three cases:
  1. Identity already exists -> update tokens, return user
  2. No identity but user with same email exists -> link identity to existing user
  3. Completely new user -> create user + identity
  """
  def find_or_create_user_from_oauth(%Ueberauth.Auth{} = auth) do
    provider = to_string(auth.provider)
    uid = to_string(auth.uid)
    email = get_oauth_email(auth)

    Repo.transact(fn ->
      case get_identity(provider, uid) do
        %UserIdentity{} = identity ->
          identity = Repo.preload(identity, :user)
          update_identity_tokens(identity, auth)
          {:ok, identity.user}

        nil ->
          case get_user_by_email(email) do
            %User{} = user ->
              {:ok, _identity} = create_identity(user, auth)
              {:ok, user}

            nil ->
              with {:ok, user} <- register_oauth_user(auth),
                   {:ok, _identity} <- create_identity(user, auth) do
                case YoutubeThing.Subscriptions.get_or_create_customer(user) do
                  {:ok, _} -> :ok
                  {:error, _} -> :ok
                end

                {:ok, user}
              end
          end
      end
    end)
  end

  defp get_oauth_email(%Ueberauth.Auth{info: %{email: email}}) when is_binary(email), do: email
  defp get_oauth_email(_), do: nil

  defp get_identity(provider, uid) do
    Repo.get_by(UserIdentity, provider: provider, uid: uid)
  end

  defp create_identity(user, auth) do
    %UserIdentity{user_id: user.id}
    |> UserIdentity.changeset(identity_attrs_from_auth(auth))
    |> Repo.insert()
  end

  defp update_identity_tokens(identity, auth) do
    identity
    |> UserIdentity.changeset(token_attrs_from_auth(auth))
    |> Repo.update()
  end

  defp register_oauth_user(auth) do
    email = get_oauth_email(auth)

    %User{}
    |> User.oauth_registration_changeset(%{email: email})
    |> Repo.insert()
  end

  defp identity_attrs_from_auth(%Ueberauth.Auth{} = auth) do
    %{
      provider: to_string(auth.provider),
      uid: to_string(auth.uid),
      email: get_oauth_email(auth),
      name: auth.info && auth.info.name,
      avatar_url: auth.info && auth.info.image,
      token: auth.credentials && auth.credentials.token,
      refresh_token: auth.credentials && auth.credentials.refresh_token,
      token_expires_at: parse_token_expiry(auth)
    }
  end

  defp token_attrs_from_auth(auth) do
    %{
      token: auth.credentials && auth.credentials.token,
      refresh_token: auth.credentials && auth.credentials.refresh_token,
      token_expires_at: parse_token_expiry(auth)
    }
  end

  defp parse_token_expiry(%Ueberauth.Auth{credentials: %{expires_at: expires_at}})
       when is_integer(expires_at) do
    DateTime.from_unix!(expires_at)
  end

  defp parse_token_expiry(_), do: nil

  ## Token helper

  defp update_user_and_delete_all_tokens(changeset) do
    Repo.transact(fn ->
      with {:ok, user} <- Repo.update(changeset) do
        tokens_to_expire = Repo.all_by(UserToken, user_id: user.id)

        Repo.delete_all(from(t in UserToken, where: t.id in ^Enum.map(tokens_to_expire, & &1.id)))

        {:ok, {user, tokens_to_expire}}
      end
    end)
  end
end
