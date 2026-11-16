-- Removes approve_order: no database function or app code calls it.
--
-- Note: an earlier version of this migration also dropped review_card, reply_support_ticket,
-- admin_approve_payment, get_admin_commerce_workspace and get_admin_moderation_workspace.
-- Those are still called by live functions (admin_review_card, admin_reply_support_ticket,
-- admin_approve_publication, get_admin_unified_commerce_workspace, get_admin_unified_moderation_workspace),
-- so they were restored and are intentionally NOT dropped here.
drop function if exists public.approve_order(uuid);
