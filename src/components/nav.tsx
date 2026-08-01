import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountRole } from "@/hooks/use-role";

export function Nav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const { user, isOwner, isPending } = useAccountRole();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const email = user?.email;
  const initials = email
    ? (email.split("@")[0] ?? "").slice(0, 2).toUpperCase()
    : "??";

  const navLinkClass = (path: string) =>
    `text-sm font-medium uppercase tracking-widest transition-colors ${
      pathname === path ? "text-electric" : "text-white/60 hover:text-white"
    }`;

  return (
    <nav className="border-b border-white/10 px-6 py-4 flex justify-between items-center gap-4">
      <Link
        to="/"
        className="text-2xl font-bold tracking-tighter text-electric no-underline"
      >
        VELOCITY
      </Link>
      <div className="flex gap-6 items-center">
        <Link to="/" className={navLinkClass("/")}>
          Venues
        </Link>
        {user && !isOwner && (
          <Link to="/bookings" className={navLinkClass("/bookings")}>
            My Tickets
          </Link>
        )}
        {user && isOwner && (
          <>
            <Link to="/owner/venues" className={navLinkClass("/owner/venues")}>
              My Venues
            </Link>
            <Link to="/owner" className={navLinkClass("/owner")}>
              Verify Tickets
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isPending ? (
          <div className="size-10 rounded-full bg-white/10 animate-pulse" />
        ) : user ? (
          <button
            onClick={async () => {
              await queryClient.cancelQueries();
              queryClient.clear();
              await supabase.auth.signOut();
            }}
            className="size-10 rounded-full bg-pulse/20 border border-pulse/40 flex items-center justify-center text-pulse text-xs font-bold hover:bg-pulse/30 transition-colors"
            title={`${email ?? ""}${isOwner ? " (owner)" : ""}`}
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
