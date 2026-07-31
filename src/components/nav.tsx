import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export function Nav() {
  const [user, setUser] = useState<null | { email?: string }>(null);
  const [loading, setLoading] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const email = user?.email;
  const initials = email
    ? (email.split("@")[0] ?? "").slice(0, 2).toUpperCase()
    : "??";

  const navLinkClass = (path: string) =>
    `text-sm font-medium uppercase tracking-widest transition-colors ${
      pathname === path
        ? "text-electric"
        : "text-white/60 hover:text-white"
    }`;

  return (
    <nav className="border-b border-white/10 px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-2xl font-bold tracking-tighter text-electric no-underline">
        VELOCITY
      </Link>
      <div className="flex gap-8 items-center">
        <Link to="/" className={navLinkClass("/")} >
          Venues
        </Link>
        {user && (
          <>
            <Link to="/bookings" className={navLinkClass("/bookings")}>
              My Bookings
            </Link>
            <Link to="/owner" className={navLinkClass("/owner")}>
              Owner Verify
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {loading ? (
          <div className="size-10 rounded-full bg-white/10 animate-pulse" />
        ) : user ? (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
            }}
            className="size-10 rounded-full bg-pulse/20 border border-pulse/40 flex items-center justify-center text-pulse text-xs font-bold hover:bg-pulse/30 transition-colors"
            title={user.email}
          >
            {initials}
          </button>
        ) : (
          <Link
            to="/auth"
            className="px-5 py-2 bg-electric text-void font-bold rounded-full text-sm uppercase tracking-widest no-underline hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
