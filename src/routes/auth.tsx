import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { becomeOwner } from "@/lib/owner.functions";
import { toast } from "sonner";

type AccountType = "player" | "owner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — VELOCITY" },
      { name: "description", content: "Sign in or create your VELOCITY account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("player");
  const queryClient = useQueryClient();
  const becomeOwnerFn = useServerFn(becomeOwner);

  async function afterSignIn() {
    if (accountType === "owner") {
      await becomeOwnerFn({});
    }
    await queryClient.invalidateQueries({ queryKey: ["my-roles"] });
    navigate({ to: accountType === "owner" ? "/owner/venues" : "/" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { account_type: accountType },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Signed in!");
        await afterSignIn();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed.");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in!");
      await afterSignIn();
    } catch {
      toast.error("Google sign-in failed.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tighter text-electric">
            VELOCITY
          </h1>
          <p className="text-white/40 text-sm mt-2">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-8 p-1 bg-surface rounded-full border border-white/10">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
              mode === "signin"
                ? "bg-electric text-void"
                : "text-white/40 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-full text-sm font-bold uppercase tracking-widest transition-colors ${
              mode === "signup"
                ? "bg-electric text-void"
                : "text-white/40 hover:text-white"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Account type */}
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
          I am a
        </p>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {(
            [
              { key: "player", title: "Player", sub: "Book slots & get tickets" },
              { key: "owner", title: "Venue Owner", sub: "List turf / gaming cafe" },
            ] as { key: AccountType; title: string; sub: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setAccountType(opt.key)}
              className={`text-left p-4 rounded-2xl border transition-colors ${
                accountType === opt.key
                  ? "border-pulse bg-pulse/10"
                  : "border-white/10 bg-surface hover:border-white/25"
              }`}
            >
              <span
                className={`block font-bold text-sm ${accountType === opt.key ? "text-pulse" : "text-white"}`}
              >
                {opt.title}
              </span>
              <span className="block text-[11px] text-white/40 mt-1">
                {opt.sub}
              </span>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-electric focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 bg-surface border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-electric focus:outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs uppercase tracking-widest">
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full py-3.5 border border-white/20 rounded-full font-bold text-white uppercase tracking-widest text-sm hover:bg-white/5 transition-colors flex items-center justify-center gap-3"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-white/30 text-xs mt-8">
          {mode === "signup"
            ? "We'll send a confirmation link to your email."
            : "New to VELOCITY? Switch to Sign Up."}
        </p>
      </div>
    </div>
  );
}
