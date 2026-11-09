import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const MOCK = "http://localhost:4010";
const SIDES = ["front", "back", "left", "right"] as const;

async function setScenario(request: APIRequestContext, name: "confident" | "low_confidence" | "garbage") {
  await request.post(`${MOCK}/__reset`);
  await request.post(`${MOCK}/__scenario`, { data: { name } });
}

/** Draws a JPEG in the browser (no fixture files needed). */
async function makePhoto(page: Page, color: string): Promise<Buffer> {
  const bytes = await page.evaluate(async (fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2400; // bigger than 2000 px so compression has to resize it
    canvas.height = 1800;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    for (let i = 0; i < 12; i++) ctx.fillRect(150 + (i % 6) * 360, 300 + Math.floor(i / 6) * 700, 200, 260);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  return Buffer.from(bytes);
}

async function fillUpToContact(page: Page) {
  await page.goto("/soumission");
  await expect(page.getByRole("heading", { name: "Quelle est l'adresse de la maison?" })).toBeVisible();

  // Step 1 — address (plain text field: no Google key in tests)
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Entrez l'adresse complète de la maison.")).toBeVisible();
  await page.getByLabel("Adresse", { exact: true }).fill("123, rue Principale, Saint-Colomban, QC");
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 2 — services
  await expect(page.getByRole("heading", { name: "Quels services voulez-vous?" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Choisissez au moins un service.")).toBeVisible();
  await page.getByRole("checkbox", { name: /Lavage de vitres/ }).check();
  await page.getByRole("checkbox", { name: /Nettoyage de gouttières/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 3 — photos
  await expect(page.getByRole("heading", { name: "Prenez 4 photos de votre maison" })).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByText("Il manque 4 photos.")).toBeVisible();

  const colors = ["#7a8fa6", "#8a7a66", "#667a6a", "#6a6a7a"];
  for (const [i, side] of SIDES.entries()) {
    await page.getByTestId(`pane-${side}`).click();
    await page.getByTestId(`camera-${side}`).setInputFiles({
      name: `${side}.jpg`,
      mimeType: "image/jpeg",
      buffer: await makePhoto(page, colors[i]),
    });
    await expect(page.getByTestId(`pane-${side}`)).toHaveAccessibleName(/photo prise/);
  }
  await expect(page.getByText("4 sur 4 photos")).toBeVisible();

  // Photos survive a reload (kept on the phone until submit)
  await page.reload();
  await expect(page.getByText("4 sur 4 photos")).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();

  // Step 4 — contact
  await expect(page.getByRole("heading", { name: "Où vous envoyer votre prix?" })).toBeVisible();
  await page.getByLabel("Prénom", { exact: true }).fill("Marie");
  await page.getByLabel("Nom", { exact: true }).fill("Tremblay");
  await page.getByLabel("Téléphone", { exact: true }).fill("450 555-1234");
  await page.getByLabel("Courriel", { exact: true }).fill("marie@exemple.ca");
}

test.describe("parcours de soumission", () => {
  test("prix instantané, forfait annuel affiché en premier, acceptation envoyée à Make", async ({ page, request }) => {
    await setScenario(request, "confident");
    await fillUpToContact(page);

    // Consent is required
    await page.getByRole("button", { name: "Voir mon prix" }).click();
    await expect(page.getByText("Cochez la case pour que nous puissions préparer votre prix.")).toBeVisible();
    await page.getByTestId("consent").check();
    await page.getByRole("button", { name: "Voir mon prix" }).click();

    // Result
    await expect(page.getByRole("heading", { name: "Votre prix" })).toBeVisible({ timeout: 60_000 });
    const plan = page.getByTestId("plan-card");
    const oneTime = page.getByTestId("onetime-card");
    await expect(plan).toBeVisible();
    await expect(page.getByTestId("plan-monthly")).toHaveText(/^62,50\s\$$/);
    await expect(page.getByTestId("plan-annual")).toContainText(/750\s\$/);
    await expect(page.getByTestId("onetime-total")).toHaveText(/^525\s\$$/);
    // Plan comes first on the page
    const planBox = (await plan.boundingBox())!;
    const oneTimeBox = (await oneTime.boundingBox())!;
    expect(planBox.y).toBeLessThan(oneTimeBox.y);

    // Breakdown lets the customer check the counts
    await expect(page.getByTestId("panes-total")).toHaveText("30 au total");
    await expect(page.getByTestId("storeys")).toHaveText("2");
    await expect(page.getByTestId("breakdown")).toContainText("1 porte-patio, 2 carreaux chacune");

    // The AI got the four photos with a structured-output format
    const ai = await (await request.get(`${MOCK}/__ai-requests`)).json();
    expect(ai).toHaveLength(1);
    expect(ai[0]).toMatchObject({ images: 4, hasOutputFormat: true, model: "claude-sonnet-5-5" });

    // Accept the plan
    await page.getByRole("button", { name: "Accepter le forfait annuel" }).click();
    await expect(page.getByRole("heading", { name: "C'est confirmé" })).toBeVisible();
    await expect(page.getByText(/Merci Marie! Vous avez choisi le forfait annuel/)).toBeVisible();

    const hooks = await (await request.get(`${MOCK}/__webhooks`)).json();
    expect(hooks.map((h: { event: string }) => h.event)).toEqual(["quote.submitted", "quote.accepted"]);
    const [submitted, accepted] = hooks;
    expect(submitted).toMatchObject({
      contact: { first_name: "Marie", last_name: "Tremblay", phone: "4505551234", email: "marie@exemple.ca" },
      address: { formatted: "123, rue Principale, Saint-Colomban, QC" },
      services: ["windows", "gutters"],
      analysis_status: "ok",
      measurements: { panes: 30, storeys: 2, walls: 4 },
      price_summary: { one_time_total: 525, annual_plan_total: 750, annual_plan_monthly: 62.5 },
      needs_review: false,
      chosen_option: null,
      consent: { accepted: true },
    });
    for (const side of SIDES) expect(submitted.photos[side]).toMatch(/^local:\/\/quotes\//);
    expect(accepted).toMatchObject({ chosen_option: "annual_plan", price_summary: { chosen_total: 750 } });
  });

  test("confiance faible : pas de prix, vérification manuelle", async ({ page, request }) => {
    await setScenario(request, "low_confidence");
    await fillUpToContact(page);
    await page.getByTestId("consent").check();
    await page.getByRole("button", { name: "Voir mon prix" }).click();

    await expect(page.getByRole("heading", { name: "Nous confirmons votre prix d'ici 2 heures" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("plan-card")).toHaveCount(0);
    await expect(page.getByText(/450 555-1234 ou à marie@exemple.ca/)).toBeVisible();

    const [hook] = await (await request.get(`${MOCK}/__webhooks`)).json();
    expect(hook).toMatchObject({ event: "quote.submitted", needs_review: true, review_reasons: ["low_confidence"] });
    // The owner still gets a draft price
    expect(hook.price_summary.one_time_total).toBe(525);
  });

  test("réponse IA invalide : un nouvel essai, puis vérification manuelle", async ({ page, request }) => {
    await setScenario(request, "garbage");
    await fillUpToContact(page);
    await page.getByTestId("consent").check();
    await page.getByRole("button", { name: "Voir mon prix" }).click();

    await expect(page.getByTestId("manual-review")).toBeVisible({ timeout: 60_000 });
    const ai = await (await request.get(`${MOCK}/__ai-requests`)).json();
    expect(ai).toHaveLength(2); // first try + one retry

    const [hook] = await (await request.get(`${MOCK}/__webhooks`)).json();
    expect(hook).toMatchObject({ analysis_status: "failed", needs_review: true, review_reasons: ["analysis_failed"], pricing: null });
  });
});

test.describe("sécurité des routes API", () => {
  const quoteId = "8f1c7a1e-6a8e-4c43-9a7e-2f6f0f3f1b11";

  test("refuse un fichier qui n'est pas une image", async ({ request }) => {
    const res = await request.post("/api/photos", {
      multipart: {
        quoteId,
        side: "front",
        photo: { name: "front.jpg", mimeType: "image/jpeg", buffer: Buffer.from("<html>pas une image</html>".repeat(100)) },
      },
    });
    expect(res.status()).toBe(415);
  });

  test("refuse une photo dont la signature est fausse", async ({ request }) => {
    const photo = { url: "https://example.com/house.jpg", sig: "forged" };
    const res = await request.post("/api/quote", {
      data: {
        quoteId,
        locale: "fr",
        address: { formatted: "123, rue Principale, Saint-Colomban", placeId: null, lat: null, lng: null },
        services: ["windows"],
        photos: { front: photo, back: photo, left: photo, right: photo },
        contact: { firstName: "A", lastName: "B", phone: "450 555-1234", email: "a@b.ca" },
        consent: true,
      },
    });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_photo" });
  });

  test("refuse un prix modifié dans le navigateur", async ({ request }) => {
    const fake = Buffer.from(JSON.stringify({ exp: 9_999_999_999, data: { pricing: { oneTime: { totalCents: 1 } } } })).toString(
      "base64url",
    );
    const res = await request.post("/api/quote/accept", { data: { token: `${fake}.not-the-signature`, option: "one_time" } });
    expect(res.status()).toBe(400);
  });
});

test("version anglaise et retour au français", async ({ page }) => {
  await page.goto("/en/quote");
  await expect(page.getByRole("heading", { name: "What is the address of the house?" })).toBeVisible();
  await page.getByRole("button", { name: "Passer au français" }).click();
  await expect(page).toHaveURL(/\/soumission$/);
  await expect(page.getByRole("heading", { name: "Quelle est l'adresse de la maison?" })).toBeVisible();
});
