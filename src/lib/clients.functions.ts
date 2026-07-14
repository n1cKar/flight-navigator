import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const ExtractedFlightSchema = z.object({
  name: z.string().nullable().optional(),
  airline: z.string().nullable().optional(),
  flight_number: z.string().nullable().optional(),
  pnr: z.string().nullable().optional(),
  departure_airport: z.string().nullable().optional(),
  arrival_airport: z.string().nullable().optional(),
  departure_date: z.string().nullable().optional(),
  departure_time: z.string().nullable().optional(),
  arrival_date: z.string().nullable().optional(),
  arrival_time: z.string().nullable().optional(),
});

export type ExtractedFlight = z.infer<typeof ExtractedFlightSchema>;

export const parseTicketPdf = createServerFn({ method: "POST" })
  .inputValidator((data: { pdfBase64: string; filename?: string }) => {
    if (!data?.pdfBase64 || typeof data.pdfBase64 !== "string") {
      throw new Error("pdfBase64 required");
    }
    return { pdfBase64: data.pdfBase64, filename: data.filename ?? "ticket.pdf" };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY || process.env.DAHAM_LANKA_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You extract flight ticket information from PDFs.
Return ONLY a JSON object matching this shape, using null for unknown fields:
{
  "name": string|null,
  "airline": string|null,
  "flight_number": string|null,
  "pnr": string|null,
  "departure_airport": string|null,
  "arrival_airport": string|null,
  "departure_date": string|null,  // YYYY-MM-DD
  "departure_time": string|null,  // HH:MM (24h)
  "arrival_date": string|null,    // YYYY-MM-DD
  "arrival_time": string|null     // HH:MM (24h)
}
For multi-leg itineraries: departure_* = the FIRST leg's origin/time, arrival_* = the FINAL destination and its local arrival date/time.
Passenger name should be as printed on the ticket. Airport as IATA code + city if visible (e.g. "DXB - Dubai").`;

    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the flight info from this ticket." },
            {
              type: "file",
              file: {
                filename: data.filename,
                file_data: `data:application/pdf;base64,${data.pdfBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    };

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please top up in workspace billing.");
      throw new Error(`AI request failed (${res.status}): ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    const result = ExtractedFlightSchema.safeParse(parsed);
    if (!result.success) {
      return {} as ExtractedFlight;
    }
    return result.data;
  });

export const getAgentView = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => {
    if (!data?.token || typeof data.token !== "string") throw new Error("token required");
    return { token: data.token };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: country, error: cErr } = await supabaseAdmin
      .from("countries")
      .select("id, name")
      .eq("agent_token", data.token)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    type ClientRow = {
      id: string;
      batch_number: string;
      name: string;
      passport_number: string;
      arrival_date: string | null;
      arrival_time: string | null;
      departure_date: string | null;
      departure_time: string | null;
      airline: string | null;
      flight_number: string | null;
      pnr: string | null;
      departure_airport: string | null;
      arrival_airport: string | null;
      notes: string | null;
      created_at: string;
    };
    if (!country) return { country: null as { id: string; name: string } | null, clients: [] as ClientRow[] };

    const { data: clients, error: clErr } = await supabaseAdmin
      .from("clients")
      .select(
        "id, batch_number, name, passport_number, arrival_date, arrival_time, departure_date, departure_time, airline, flight_number, pnr, departure_airport, arrival_airport, notes, created_at",
      )
      .eq("country_id", country.id)
      .order("arrival_date", { ascending: true, nullsFirst: false })
      .order("arrival_time", { ascending: true, nullsFirst: false });

    if (clErr) throw new Error(clErr.message);
    return { country: country as { id: string; name: string } | null, clients: (clients ?? []) as ClientRow[] };
  });
