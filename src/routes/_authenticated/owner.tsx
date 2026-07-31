import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyTicket } from "@/lib/bookings.functions";
import { toast } from "sonner";
import type { VerifyResult } from "@/lib/bookings.functions";

export const Route = createFileRoute("/_authenticated/owner")({
  head: () => ({
    meta: [
      { title: "Owner Verify — VELOCITY" },
      {
        name: "description",
        content: "Verify customer booking tickets by code.",
      },
    ],
  }),
  component: OwnerPage,
});

function OwnerPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const verifyFn = useServerFn(verifyTicket);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await verifyFn({ data: { code: code.trim() } });
      setResult(res);
      if (res.success) {
        toast.success(res.message);
        setCode("");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Verification failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
        OWNER VERIFY
      </h1>
      <p className="text-white/40 mb-8">
        Enter a customer's ticket code to verify and mark it as used.
      </p>

      {/* Verify input */}
      <form
        onSubmit={handleVerify}
        className="flex gap-3 mb-8"
      >
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VX-XXXX-X"
          maxLength={12}
          className="flex-1 px-5 py-4 bg-surface border border-white/10 rounded-2xl text-2xl font-mono font-bold text-white placeholder:text-white/20 focus:border-electric focus:outline-none transition-colors text-center tracking-widest"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="px-8 py-4 bg-electric text-void font-bold rounded-2xl uppercase tracking-widest text-sm transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {loading ? "..." : "Verify"}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div
          className={`p-6 rounded-3xl border ${
            result.success
              ? "bg-pulse/10 border-pulse/30"
              : "bg-destructive/10 border-destructive/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`size-10 rounded-full flex items-center justify-center text-xl ${
                result.success
                  ? "bg-pulse text-void"
                  : "bg-destructive text-white"
              }`}
            >
              {result.success ? "✓" : "✕"}
            </div>
            <div>
              <p
                className={`font-bold ${result.success ? "text-pulse" : "text-destructive"}`}
              >
                {result.message}
              </p>
            </div>
          </div>
          {result.booking && (
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-[10px] uppercase text-white/30 mb-1">
                  Venue
                </p>
                <p className="text-white font-medium">
                  {result.booking.venue_name}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/30 mb-1">Date</p>
                <p className="text-white font-medium">
                  {result.booking.booking_date}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/30 mb-1">
                  Time
                </p>
                <p className="text-white font-mono">
                  {result.booking.start_time.slice(0, 5)} -{" "}
                  {result.booking.end_time.slice(0, 5)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/30 mb-1">
                  Status
                </p>
                <p className="text-white font-mono uppercase">
                  {result.booking.status}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
