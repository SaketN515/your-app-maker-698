import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccountRole } from "@/hooks/use-role";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };

  const itemClass =
    "text-sm text-white/80 focus:bg-white/10 focus:text-white cursor-pointer";

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-10 rounded-full bg-pulse/20 border border-pulse/40 flex items-center justify-center text-pulse text-xs font-bold hover:bg-pulse/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-electric"
                aria-label="Account menu"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-surface border-white/10 rounded-2xl p-2"
            >
              <DropdownMenuLabel className="px-2 py-1.5">
                <p className="text-[10px] uppercase tracking-widest text-white/30">
                  {isOwner ? "Owner account" : "Player account"}
                </p>
                <p className="text-xs text-white/70 font-mono truncate">
                  {email ?? ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {isOwner ? (
                <>
                  <DropdownMenuItem asChild className={itemClass}>
                    <Link to="/owner/venues">My Venues</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={itemClass}>
                    <Link to="/owner">Verify Tickets</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={itemClass}>
                    <Link to="/owner/setup">Add New Venue</Link>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem asChild className={itemClass}>
                    <Link to="/bookings">Tickets</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className={itemClass}>
                    <Link to="/">Browse Venues</Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onSelect={signOut}
                className="text-sm text-destructive focus:bg-destructive/15 focus:text-destructive cursor-pointer"
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
