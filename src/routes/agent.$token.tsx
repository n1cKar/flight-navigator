import { createFileRoute, notFound } from "@tanstack/react-router";
import { Plane, Calendar, Clock, MapPin, User, FileText } from "lucide-react";
import logoAsset from "@/assets/logo.ico.asset.json";

import { getAgentView } from "@/lib/clients.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/agent/$token")({
  loader: async ({ params }) => {
    const result = await getAgentView({ data: { token: params.token } });
    if (!result.country) throw notFound();
    return result;
  },
  component: AgentPage,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Invalid link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This agent link is not recognised. Please check with the office.
        </p>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <p className="text-sm text-muted-foreground">Failed to load: {error.message}</p>
    </div>
  ),
});

type Client = {
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

function AgentPage() {
  const data = Route.useLoaderData() as {
    country: { id: string; name: string } | null;
    clients: Client[];
  };
  const { country, clients } = data;
  if (!country) return null;

  const upcoming = clients.filter((c: Client) => {
    if (!c.arrival_date) return true;
    const arrival = new Date(c.arrival_date + "T" + (c.arrival_time ?? "00:00"));
    return arrival.getTime() >= Date.now() - 24 * 60 * 60 * 1000;
  });
  const past = clients.filter((c: Client) => !upcoming.includes(c));

  // Group upcoming by batch
  const batches = new Map<string, Client[]>();
  for (const c of upcoming) {
    const list = batches.get(c.batch_number) ?? [];
    list.push(c);
    batches.set(c.batch_number, list);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <img src={logoAsset.url} alt="Daham Lanka logo" className="h-10 w-10 rounded-lg object-contain" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Daham Lanka — arrivals
            </p>
            <h1 className="text-lg font-semibold leading-tight">{country.name}</h1>
          </div>
          <Badge variant="secondary">
            {upcoming.length} upcoming
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Upcoming arrivals in {country.name}
          </h2>
          {upcoming.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No upcoming arrivals recorded.
              </CardContent>
            </Card>
          ) : (
            Array.from(batches.entries()).map(([batch, rows]) => (
              <Card key={batch}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>Batch {batch}</span>
                    <Badge variant="outline">{rows.length} people</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rows.map((c, idx) => (
                    <div key={c.id}>
                      {idx > 0 && <Separator className="my-3" />}
                      <ClientCard client={c} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </section>

        {past.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Past arrivals
            </h2>
            <Card>
              <CardContent className="divide-y">
                {past.map((c) => (
                  <div key={c.id} className="py-3">
                    <ClientCard client={c} muted />
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}



function ClientCard({ client, muted = false }: { client: Client; muted?: boolean }) {
  return (
    <div className={muted ? "opacity-70" : ""}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-base font-semibold">
            <User className="h-4 w-4 text-muted-foreground" />
            {client.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Passport: <span className="font-mono">{client.passport_number}</span>
          </p>
        </div>
        {(client.arrival_date || client.arrival_time) && (
          <div className="rounded-md border bg-primary/5 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Arriving
            </p>
            <p className="text-sm font-semibold">
              {formatDate(client.arrival_date)}
              {client.arrival_time && (
                <span className="ml-1 font-mono text-muted-foreground">
                  {client.arrival_time.slice(0, 5)}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {(client.airline || client.flight_number) && (
          <Detail
            icon={<Plane className="h-3.5 w-3.5" />}
            label="Flight"
            value={[client.airline, client.flight_number].filter(Boolean).join(" ")}
          />
        )}
        {client.pnr && (
          <Detail icon={<FileText className="h-3.5 w-3.5" />} label="PNR" value={client.pnr} />
        )}
        {(client.departure_airport || client.arrival_airport) && (
          <Detail
            icon={<MapPin className="h-3.5 w-3.5" />}
            label="Route"
            value={`${client.departure_airport ?? "?"} → ${client.arrival_airport ?? "?"}`}
          />
        )}
        {(client.departure_date || client.departure_time) && (
          <Detail
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Departed"
            value={`${formatDate(client.departure_date)}${
              client.departure_time ? " " + client.departure_time.slice(0, 5) : ""
            }`}
          />
        )}
      </div>

      {client.notes && (
        <p className="mt-3 rounded-md bg-muted p-2 text-xs text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          {client.notes}
        </p>
      )}
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}
