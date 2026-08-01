import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createVenueWithSlots, type SlotInput } from "@/lib/owner.functions";
import {
  getNextDays,
  timeSlots,
  venueTypeIcons,
  formatBookingDate,
  type VenueType,
} from "@/lib/venue-images";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/owner_/setup")({
  head: () => ({
    meta: [
      { title: "List Your Venue — VELOCITY" },
      {
        name: "description",
        content:
          "Add your turf, gaming cafe or console lounge with photos, slots and prices.",
      },
    ],
  }),
  component: OwnerSetupPage,
});

const venueTypes: { key: VenueType; title: string; sub: string }[] = [
  { key: "turf", title: "Turf Field", sub: "Football / cricket turf" },
  { key: "gaming_cafe", title: "Gaming Cafe", sub: "PC gaming stations" },
  { key: "console_lounge", title: "Console Lounge", sub: "PS5 / Xbox lounge" },
];

function OwnerSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createFn = useServerFn(createVenueWithSlots);

  const [step, setStep] = useState(1);
  const [type, setType] = useState<VenueType | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(10);

  const [uploading, setUploading] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const days = getNextDays(14);
  const [slotDate, setSlotDate] = useState(days[0]?.date ?? "");
  const [price, setPrice] = useState(10);
  const [hours, setHours] = useState<string[]>([]);
  const [slots, setSlots] = useState<SlotInput[]>([]);
  const [saving, setSaving] = useState(false);

  const slotDates = Array.from(new Set(slots.map((s) => s.date))).sort();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be under 8MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("venue-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      setImagePath(path);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Photo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addDaySlots() {
    if (hours.length === 0) {
      toast.error("Pick at least one hour");
      return;
    }
    const additions: SlotInput[] = hours.flatMap((start) => {
      const slot = timeSlots.find((s) => s.start === start);
      if (!slot) return [];
      return [{ date: slotDate, start: slot.start, end: slot.end, price }];
    });
    setSlots((prev) => [
      ...prev.filter(
        (p) => !additions.some((a) => a.date === p.date && a.start === p.start),
      ),
      ...additions,
    ]);
    setHours([]);
    toast.success(`${additions.length} slots added for ${slotDate}`);
  }

  async function handleSubmit() {
    if (!type || !name.trim() || !imagePath || slots.length === 0) return;
    setSaving(true);
    try {
      await createFn({
        data: {
          name,
          type,
          description,
          address,
          capacity,
          imagePath,
          slots,
        },
      });
      await queryClient.invalidateQueries();
      toast.success("Your venue is live!");
      navigate({ to: "/owner/venues" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not save your venue",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-3 bg-void/60 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:border-electric focus:outline-none transition-colors";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold tracking-tighter text-white mb-2">
        LIST YOUR VENUE
      </h1>
      <p className="text-white/40 mb-8">
        Four quick steps and players can start booking you.
      </p>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-electric" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      <div className="bg-surface rounded-3xl p-6 border border-white/10">
        {/* Step 1 — type */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-white mb-6">
              What do you run?
            </h2>
            <div className="space-y-3 mb-8">
              {venueTypes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`w-full text-left p-4 rounded-2xl border flex items-center gap-4 transition-colors ${
                    type === t.key
                      ? "border-pulse bg-pulse/10"
                      : "border-white/10 bg-void/40 hover:border-white/25"
                  }`}
                >
                  <span className="text-2xl">{venueTypeIcons[t.key]}</span>
                  <span>
                    <span
                      className={`block font-bold ${type === t.key ? "text-pulse" : "text-white"}`}
                    >
                      {t.title}
                    </span>
                    <span className="block text-xs text-white/40">{t.sub}</span>
                  </span>
                </button>
              ))}
            </div>
            <button
              disabled={!type}
              onClick={() => setStep(2)}
              className="w-full py-3.5 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm disabled:opacity-30"
            >
              Next
            </button>
          </>
        )}

        {/* Step 2 — details */}
        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-white mb-6">
              Tell us about it
            </h2>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
                  Venue name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="Apex Arena: Pitch A"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
                  Address (optional)
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={200}
                  placeholder="Street, area, city"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
                  Short description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Floodlit 5-a-side turf with changing rooms"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/30 block mb-2">
                  Max people per slot
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value) || 1)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3.5 border border-white/15 text-white/60 font-bold rounded-full uppercase tracking-widest text-sm"
              >
                Back
              </button>
              <button
                disabled={!name.trim()}
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 3 — photo */}
        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Add a photo</h2>
            <p className="text-white/40 text-sm mb-6">
              This is what players see in the app.
            </p>
            <label className="block w-full aspect-[16/9] rounded-2xl border border-dashed border-white/20 bg-void/40 mb-6 overflow-hidden cursor-pointer hover:border-electric/50 transition-colors">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Venue preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="w-full h-full flex flex-col items-center justify-center text-white/40 text-sm">
                  <span className="text-3xl mb-2">＋</span>
                  {uploading ? "Uploading..." : "Tap to upload a photo"}
                </span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3.5 border border-white/15 text-white/60 font-bold rounded-full uppercase tracking-widest text-sm"
              >
                Back
              </button>
              <button
                disabled={!imagePath || uploading}
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* Step 4 — slots + prices */}
        {step === 4 && (
          <>
            <h2 className="text-xl font-bold text-white mb-2">
              Slots & prices
            </h2>
            <p className="text-white/40 text-sm mb-6">
              Add at least one day of slots. Price is per person, per hour.
            </p>

            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
              Day
            </p>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {days.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSlotDate(day.date)}
                  className={`shrink-0 px-4 py-3 rounded-xl text-center min-w-[76px] transition-colors ${
                    slotDate === day.date
                      ? "bg-electric text-void"
                      : "bg-void/50 text-white/50 border border-white/10 hover:text-white"
                  }`}
                >
                  <span className="block text-sm font-bold">{day.label}</span>
                  <span className="block text-xs opacity-70">{day.sub}</span>
                  {slots.some((s) => s.date === day.date) && (
                    <span className="block text-[10px] text-pulse mt-0.5">
                      ●
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
              Open hours on this day
            </p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-6">
              {timeSlots.map((slot) => {
                const selected = hours.includes(slot.start);
                const already = slots.some(
                  (s) => s.date === slotDate && s.start === slot.start,
                );
                return (
                  <button
                    key={slot.start}
                    onClick={() =>
                      setHours((prev) =>
                        prev.includes(slot.start)
                          ? prev.filter((h) => h !== slot.start)
                          : [...prev, slot.start],
                      )
                    }
                    className={`px-2 py-3 rounded-xl text-sm font-mono font-bold transition-colors ${
                      selected
                        ? "bg-pulse text-void"
                        : already
                          ? "bg-pulse/15 text-pulse border border-pulse/30"
                          : "bg-void/50 text-white/50 border border-white/10 hover:text-white"
                    }`}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>

            <p className="text-[10px] uppercase tracking-widest text-white/30 mb-3">
              Price per person / hour
            </p>
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                  $
                </span>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className={`${inputClass} pl-8`}
                />
              </div>
              <button
                onClick={addDaySlots}
                className="px-6 bg-pulse text-void font-bold rounded-xl uppercase tracking-widest text-xs"
              >
                Add slots
              </button>
            </div>

            {slotDates.length > 0 && (
              <div className="space-y-3 mb-8 pt-6 border-t border-white/10">
                {slotDates.map((date) => {
                  const daySlots = slots.filter((s) => s.date === date);
                  return (
                    <div key={date} className="bg-void/40 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-white font-medium text-sm">
                          {formatBookingDate(date)}
                        </p>
                        <button
                          onClick={() =>
                            setSlots((prev) =>
                              prev.filter((s) => s.date !== date),
                            )
                          }
                          className="text-xs text-white/40 hover:text-destructive"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="font-mono text-xs text-white/50">
                        {daySlots
                          .map((s) => `${s.start} ($${s.price})`)
                          .join("  ·  ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-3.5 border border-white/15 text-white/60 font-bold rounded-full uppercase tracking-widest text-sm"
              >
                Back
              </button>
              <button
                disabled={slots.length === 0 || saving}
                onClick={() => void handleSubmit()}
                className="flex-1 py-3.5 bg-electric text-void font-bold rounded-full uppercase tracking-widest text-sm disabled:opacity-30"
              >
                {saving ? "Publishing..." : "Publish venue"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
