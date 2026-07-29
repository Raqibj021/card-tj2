import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function PromoClaimer() {
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const claim = async () => {
      const { data } = await client.auth.getUser();
      if (!data.user?.email_confirmed_at) return;
      await client.rpc("claim_launch_promo");
    };

    void claim();
    const { data: subscription } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void claim();
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return null;
}
