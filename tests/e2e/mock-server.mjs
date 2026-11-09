// Fake Anthropic Messages API + fake Make webhook for the Playwright tests.
// Control endpoints (used by the tests): POST /__scenario, POST /__reset, GET /__webhooks, GET /__ai-requests.
import http from "node:http";

const port = Number(process.env.MOCK_PORT || 4010);

const CONFIDENT = {
  // 12 + 10 + 4 + 2 = 28 panes + 1 patio door (2 panes) = 30 → windows + gutters = $525, plan $750 ($62.50/month)
  panes_per_side: { front: 12, back: 10, left: 4, right: 2 },
  patio_doors: 1,
  storeys: 2,
  walls: 4,
  obstructions: ["Haie de cèdres le long du côté gauche"],
  confidence: 0.93,
  notes: "Photos nettes, maison bien visible.",
};

const SCENARIOS = {
  confident: () => JSON.stringify(CONFIDENT),
  low_confidence: () => JSON.stringify({ ...CONFIDENT, confidence: 0.55, notes: "Arrière partiellement caché." }),
  garbage: () => "Désolé, je ne peux pas compter les fenêtres.",
};

let scenario = "confident";
let webhooks = [];
let aiRequests = [];
let messageCount = 0;

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (req.method === "GET" && url.pathname === "/__health") return send(res, 200, { ok: true });
    if (req.method === "GET" && url.pathname === "/__webhooks") return send(res, 200, webhooks);
    if (req.method === "GET" && url.pathname === "/__ai-requests") return send(res, 200, aiRequests);
    if (req.method === "POST" && url.pathname === "/__reset") {
      webhooks = [];
      aiRequests = [];
      scenario = "confident";
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/__scenario") {
      const { name } = await readJson(req);
      if (!SCENARIOS[name]) return send(res, 400, { error: `unknown scenario ${name}` });
      scenario = name;
      return send(res, 200, { ok: true, scenario });
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      webhooks.push(await readJson(req));
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end("Accepted");
    }

    if (req.method === "POST" && url.pathname.startsWith("/v1/messages")) {
      const body = await readJson(req);
      const content = body.messages?.[0]?.content ?? [];
      aiRequests.push({
        model: body.model,
        images: content.filter((b) => b.type === "image").length,
        hasOutputFormat: Boolean(body.output_config?.format),
        apiKey: req.headers["x-api-key"] ?? null,
      });
      messageCount += 1;
      return send(res, 200, {
        id: `msg_mock_${messageCount}`,
        type: "message",
        role: "assistant",
        model: body.model,
        content: [{ type: "text", text: SCENARIOS[scenario]() }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 6000, output_tokens: 120 },
      });
    }

    send(res, 404, { error: "not_found", path: url.pathname });
  } catch (err) {
    send(res, 500, { error: String(err) });
  }
});

server.listen(port, () => console.log(`[mock] Anthropic + Make mock on http://localhost:${port}`));
