-- Migration: Add delete policy for household_members
-- CB-009: Allow members to remove other members from their household

-- Members can remove other members from their household (but not themselves)
DROP POLICY IF EXISTS members_delete ON household_members;
CREATE POLICY members_delete ON household_members
FOR DELETE USING (
  is_household_member(household_id)
  AND auth.uid() != user_id
);

COMMENT ON POLICY members_delete ON household_members IS
  'Members can remove other members from their household, but cannot remove themselves';
