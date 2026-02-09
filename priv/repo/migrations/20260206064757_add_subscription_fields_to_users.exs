defmodule YoutubeThing.Repo.Migrations.AddSubscriptionFieldsToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :stripe_customer_id, :string
      add :subscription_tier, :string, default: "free", null: false
      add :subscription_status, :string, default: "inactive", null: false
      add :subscription_id, :string
      add :subscription_period_end, :utc_datetime
    end

    create unique_index(:users, [:stripe_customer_id])
    create unique_index(:users, [:subscription_id])
  end
end
