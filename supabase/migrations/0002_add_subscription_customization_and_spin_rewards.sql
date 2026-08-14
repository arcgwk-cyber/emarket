-- Add subscription_category to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS subscription_category varchar(30);

-- Create subscription_selections table
CREATE TABLE IF NOT EXISTS subscription_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_date date NOT NULL,
  selections jsonb NOT NULL DEFAULT '{"garnish": [], "seasonal": [], "regular": [], "leafy": []}'::jsonb,
  status varchar(20) NOT NULL DEFAULT 'pending',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Create user_spin_rewards table
CREATE TABLE IF NOT EXISTS user_spin_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spins_available integer NOT NULL DEFAULT 0,
  spins_claimed integer NOT NULL DEFAULT 0,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
