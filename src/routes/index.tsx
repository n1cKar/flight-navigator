import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Copy, Check, Loader2, Plus, Users, Trash2 } from "lucide-react";
import logoAsset from "@/assets/logo.png.asset.json";

import { supabase } from "@/integrations/supabase/client";
import { parseTicketPdf } from "@/lib/clients.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/")({
  component: AdminPage,
});

type Country = { id: string; name: string; agent_token: string };

const emptyForm = {
  country_id: "",
  batch_number: "",
  name: "",
  passport_number: "",
  arrival_date: "",
  arrival_time: "",
  departure_date: "",
  departure_time: "",
  airline: "",
  flight_number: "",
  pnr: "",
  departure_airport: "",
  arrival_airport: "",
  notes: "",
};

function AdminPage() {
  const parsePdf = useServerFn(parseTicketPdf);
  const [countries, setCountries] = useState<Country[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [newCountryName, setNewCountryName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadCountries() {
    const { data, error } = await supabase
      .from("countries")
      .select("id, name, agent_token")
      .order("name");
    if (error) {
      toast.error("Failed to load countries: " + error.message);
      return;
    }
    setCountries(data ?? []);
  }

  useEffect(() => {
    loadCountries();
  }, []);

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handlePdfUpload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    setParsing(true);
    try {
      const base64 = await fileToBase64(file);
      const extracted = await parsePdf({ data: { pdfBase64: base64, filename: file.name } });
      setForm((f) => ({
        ...f,
        name: extracted.name ?? f.name,
        airline: extracted.airline ?? f.airline,
        flight_number: extracted.flight_number ?? f.flight_number,
        pnr: extracted.pnr ?? f.pnr,
        departure_airport: extracted.departure_airport ?? f.departure_airport,
        arrival_airport: extracted.arrival_airport ?? f.arrival_airport,
        departure_date: extracted.departure_date ?? f.departure_date,
        departure_time: extracted.departure_time ?? f.departure_time,
        arrival_date: extracted.arrival_date ?? f.arrival_date,
        arrival_time: extracted.arrival_time ?? f.arrival_time,
      }));
      toast.success("Ticket details extracted. Review and submit below.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read ticket PDF");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.country_id) return toast.error("Select a country");
    if (!form.batch_number.trim()) return toast.error("Enter a batch number");
    if (!form.name.trim()) return toast.error("Enter the client's name");
    if (!form.passport_number.trim()) return toast.error("Enter the passport number");

    setSaving(true);
    const payload = {
      country_id: form.country_id,
      batch_number: form.batch_number.trim(),
      name: form.name.trim(),
      passport_number: form.passport_number.trim(),
      arrival_date: form.arrival_date || null,
      arrival_time: form.arrival_time || null,
      departure_date: form.departure_date || null,
      departure_time: form.departure_time || null,
      airline: form.airline.trim() || null,
      flight_number: form.flight_number.trim() || null,
      pnr: form.pnr.trim() || null,
      departure_airport: form.departure_airport.trim() || null,
      arrival_airport: form.arrival_airport.trim() || null,
      notes: form.notes.trim() || null,
    };
    const { error } = await supabase.from("clients").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return;
    }
    toast.success("Client saved");
    setForm({ ...emptyForm, country_id: form.country_id, batch_number: form.batch_number });
  }

  async function handleAddCountry() {
    const name = newCountryName.trim();
    if (!name) return;
    const { error } = await supabase.from("countries").insert({ name });
    if (error) {
      toast.error("Failed to add country: " + error.message);
      return;
    }
    toast.success(`Added ${name}`);
    setNewCountryName("");
    setAddCountryOpen(false);
    loadCountries();
  }

  function agentUrl(token: string) {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/agent/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(agentUrl(token));
    setCopiedToken(token);
    toast.success("Link copied");
    setTimeout(() => setCopiedToken(null), 1500);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <img src={logoAsset.url} alt="Daham Lanka (PVT) LTD" className="h-12 w-auto object-contain" />
          <div className="border-l pl-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Client flight tracker</p>
            <p className="text-sm font-medium">Admin console</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add a client</CardTitle>
            <CardDescription>
              Select the destination country, enter the client's details, then upload their
              ticket PDF to auto-fill flight information. PDFs are not stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <div className="flex gap-2">
                    <Select
                      value={form.country_id}
                      onValueChange={(v) => updateField("country_id", v)}
                    >
                      <SelectTrigger id="country" className="flex-1">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Dialog open={addCountryOpen} onOpenChange={setAddCountryOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="Add country">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add a country</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="new-country">Country name</Label>
                          <Input
                            id="new-country"
                            value={newCountryName}
                            onChange={(e) => setNewCountryName(e.target.value)}
                            placeholder="e.g. Qatar"
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" onClick={handleAddCountry}>
                            Add country
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch">Batch number</Label>
                  <Input
                    id="batch"
                    value={form.batch_number}
                    onChange={(e) => updateField("batch_number", e.target.value)}
                    placeholder="e.g. B-2026-014"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Client name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="As on passport"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passport">Passport number</Label>
                  <Input
                    id="passport"
                    value={form.passport_number}
                    onChange={(e) => updateField("passport_number", e.target.value)}
                    placeholder="e.g. N1234567"
                  />
                </div>
              </div>

              <Separator />

              <div className="rounded-lg border border-dashed bg-muted/40 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-fill from ticket PDF</p>
                    <p className="text-xs text-muted-foreground">
                      Upload the flight ticket — we'll read it, fill the fields, and discard the file.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePdfUpload(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={parsing}
                    >
                      {parsing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading…
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" /> Upload PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Departure date</Label>
                  <Input
                    type="date"
                    value={form.departure_date}
                    onChange={(e) => updateField("departure_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure time</Label>
                  <Input
                    type="time"
                    value={form.departure_time}
                    onChange={(e) => updateField("departure_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival date</Label>
                  <Input
                    type="date"
                    value={form.arrival_date}
                    onChange={(e) => updateField("arrival_date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival time</Label>
                  <Input
                    type="time"
                    value={form.arrival_time}
                    onChange={(e) => updateField("arrival_time", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Airline</Label>
                  <Input
                    value={form.airline}
                    onChange={(e) => updateField("airline", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Flight number</Label>
                  <Input
                    value={form.flight_number}
                    onChange={(e) => updateField("flight_number", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Departure airport</Label>
                  <Input
                    value={form.departure_airport}
                    onChange={(e) => updateField("departure_airport", e.target.value)}
                    placeholder="e.g. CMB — Colombo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Arrival airport</Label>
                  <Input
                    value={form.arrival_airport}
                    onChange={(e) => updateField("arrival_airport", e.target.value)}
                    placeholder="e.g. TLV — Tel Aviv"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>PNR / Booking reference</Label>
                  <Input value={form.pnr} onChange={(e) => updateField("pnr", e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    placeholder="Anything the agent should know"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : (
                    "Save client"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Agent links
            </CardTitle>
            <CardDescription>
              Share the link for each country with the local agent. Anyone with a link can view
              that country's clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {countries.length === 0 && (
              <p className="text-sm text-muted-foreground">No countries yet.</p>
            )}
            {countries.map((c) => (
              <div key={c.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(c.agent_token)}
                  >
                    {copiedToken === c.agent_token ? (
                      <>
                        <Check className="mr-1 h-4 w-4" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" /> Copy link
                      </>
                    )}
                  </Button>
                </div>
                <p className="mt-1 break-all text-xs text-muted-foreground">
                  {agentUrl(c.agent_token)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
