DROP TABLE IF EXISTS donations;
ALTER TABLE charities DROP COLUMN IF EXISTS website_url;
ALTER TABLE charities DROP COLUMN IF EXISTS razorpayx_contact_id;
