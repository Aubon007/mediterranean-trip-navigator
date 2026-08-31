const KEY = "master-locations-v1";

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const validLocation = (item) =>
  item &&
  typeof item.group === "string" &&
  typeof item.city === "string" &&
  typeof item.name === "string" &&
  item.group.trim() &&
  item.city.trim() &&
  item.name.trim();

export async function onRequestGet({ env }) {
  if (!env.MASTER_LOCATIONS) {
    return json({ locations: [], source: "not_configured" });
  }

  const saved = await env.MASTER_LOCATIONS.get(KEY, "json");
  return json({ locations: Array.isArray(saved) ? saved : [], source: "cloud" });
}

export async function onRequestPost({ request, env }) {
  if (!env.MASTER_LOCATIONS) {
    return json({ error: "Cloud storage is not configured yet." }, 501);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid save request." }, 400);
  }

  const expectedPin = env.MASTER_PIN || "2026";
  if (!payload || String(payload.pin || "") !== expectedPin) {
    return json({ error: "Incorrect PIN." }, 403);
  }

  const locations = payload.locations;
  if (!Array.isArray(locations) || !locations.length || !locations.every(validLocation)) {
    return json({ error: "Master location list is not valid." }, 400);
  }

  const clean = locations.map((item) => ({
    group: String(item.group).trim(),
    city: String(item.city).trim(),
    name: String(item.name).trim(),
    zh: String(item.zh || "").trim(),
    query: String(item.query || "").trim(),
  }));

  await env.MASTER_LOCATIONS.put(KEY, JSON.stringify(clean));
  return json({ ok: true, locations: clean, source: "cloud" });
}
