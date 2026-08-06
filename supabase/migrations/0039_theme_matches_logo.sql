-- Sidebar/theme color changed to actually match the logo's real
-- gradient (#2f3fd9 -> #7b3fd9), replacing the neutral zinc gradient
-- used since the earlier "neutral colour" request. Editing migration
-- 0007's seed values wouldn't retroactively update a row that's
-- already been inserted on a live database, so this updates the
-- existing branding_settings row directly.

update branding_settings
set primary_color = '#2f3fd9',
    primary_gradient_color_1 = '#7b3fd9',
    updated_at = now()
where id = true;
