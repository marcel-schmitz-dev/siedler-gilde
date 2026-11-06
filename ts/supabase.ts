import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// supabase-js wird lokal als Browser-Bundle ausgeliefert (js/vendor/supabase.js, siehe index.html)
// und stellt das globale Objekt "supabase" bereit. Die Typen kommen weiterhin aus dem npm-Paket.
declare global {
    interface Window {
        supabase: {
            createClient: (url: string, key: string) => SupabaseClient;
        };
    }
}

export const supabase: SupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
