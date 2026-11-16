-- Removes database functions that nothing in the app or edge functions calls anymore.
-- Each was superseded by a newer function:
--   review_card                      -> admin_review_card (011/012+)
--   reply_support_ticket             -> admin_reply_support_ticket
--   approve_order                    -> admin_approve_publication / admin_approve_payment flow
--   admin_approve_payment            -> admin_approve_publication
--   get_admin_commerce_workspace     -> get_admin_unified_commerce_workspace
--   get_admin_moderation_workspace   -> get_admin_unified_moderation_workspace
-- To restore one, re-run its CREATE FUNCTION from the migration named above
-- (003, 008, 013, 012 respectively; admin_approve_payment is in 029).

drop function if exists public.review_card(uuid, public.review_status, text);
drop function if exists public.reply_support_ticket(uuid, text, boolean);
drop function if exists public.approve_order(uuid);
drop function if exists public.admin_approve_payment(uuid, text);
drop function if exists public.get_admin_commerce_workspace();
drop function if exists public.get_admin_moderation_workspace();
