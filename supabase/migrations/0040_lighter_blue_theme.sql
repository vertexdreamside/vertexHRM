-- Replace the dark theme with a lighter blue sampled directly from the
-- reference background image, per request ("replace the black...
-- with something lighter, e.g. the blue in the image"). Same reason
-- as migration 0039: updating the migration 0007 seed alone would not
-- retroactively change the row already sitting in the live database.

update branding_settings
set primary_color = '#1668d6',
    primary_gradient_color_1 = '#4f8fea',
    updated_at = now()
where id = true;
