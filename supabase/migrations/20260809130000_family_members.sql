-- ============================================================
-- Family members (Feature #6): "طلب للعيلة"
-- Each customer manages family members, and every order can be
-- assigned to a member. Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  relation text,
  age integer,
  weight numeric(6,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_members_public_select" ON family_members;
CREATE POLICY "family_members_public_select" ON family_members FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "family_members_public_insert" ON family_members;
CREATE POLICY "family_members_public_insert" ON family_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "family_members_public_update" ON family_members;
CREATE POLICY "family_members_public_update" ON family_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "family_members_public_delete" ON family_members;
CREATE POLICY "family_members_public_delete" ON family_members FOR DELETE
  TO anon, authenticated USING (true);

-- Link each order (and group) to the family member it belongs to
ALTER TABLE order_groups ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS family_member_id uuid REFERENCES family_members(id) ON DELETE SET NULL;

-- ============ Important note ============
-- After running, wait a second then reload the page to refresh schema cache.
