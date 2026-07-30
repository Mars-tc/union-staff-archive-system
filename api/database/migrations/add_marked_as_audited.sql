ALTER TABLE membership_applications ADD COLUMN IF NOT EXISTS marked_as_audited BOOLEAN DEFAULT FALSE;
ALTER TABLE difficulty_applications ADD COLUMN IF NOT EXISTS marked_as_audited BOOLEAN DEFAULT FALSE;
ALTER TABLE mutual_aid_applications ADD COLUMN IF NOT EXISTS marked_as_audited BOOLEAN DEFAULT FALSE;
ALTER TABLE fee_authorizations ADD COLUMN IF NOT EXISTS marked_as_audited BOOLEAN DEFAULT FALSE;
