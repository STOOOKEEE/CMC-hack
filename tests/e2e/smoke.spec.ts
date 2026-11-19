import { expect, test } from "@playwright/test";

test("search for nvda and land on the best pick", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Which token should I buy/ })).toBeVisible();
  await expect(page.getByTestId("data-banner")).toContainText("Demo data");
  const search = page.getByRole("combobox");
  await search.fill("nvda");
  await expect(page.getByRole("option").first()).toContainText("NVDA");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/a\/nvda$/);
  await expect(page.getByTestId("best-pick")).toContainText("NVDAx");
  await expect(page.getByTestId("where-to-buy")).toContainText("Kraken");
  await expect(page.getByTestId("summary-warnings")).toContainText("2 versions have no market");
});

test("the chain filter counts every chain a token is deployed on", async ({ page }) => {
  await page.goto("/a/nvda");
  // NVDAx's primary chain is Solana, but it is also deployed on Ethereum.
  await page.getByRole("button", { name: "Ethereum", exact: true }).click();
  await expect(page.getByTestId("best-in-filter")).toContainText("Best on Ethereum: NVDAx");
  await page.getByRole("button", { name: "Robinhood Chain", exact: true }).click();
  await expect(page.getByTestId("best-in-filter")).toContainText("Best on Robinhood Chain: NVDAon");
});

test("where to buy lists the other chains with their own explorer links", async ({ page }) => {
  await page.goto("/a/nvda");
  const where = page.getByTestId("where-to-buy");
  await expect(where).toContainText("Also on");
  await expect(where.getByRole("link", { name: /Ethereum/ })).toHaveAttribute(
    "href",
    "https://etherscan.io/token/0xc845b2894dbddd03858fd2d643b4ef725fe0849d",
  );
});

test("gold flags per-gram tokens as a different unit", async ({ page }) => {
  await page.goto("/a/gold");
  await expect(page.getByTestId("best-pick")).toContainText("PAXG");
  await expect(page.getByText("Different unit").first()).toBeVisible();
});

test("an asset with no market has no best pick", async ({ page }) => {
  await page.goto("/a/MS");
  await expect(page.getByTestId("no-best-pick")).toContainText("No tradable version right now");
});

test("an unknown ticker shows the not-found page with suggestions", async ({ page }) => {
  // The status is 200 because loading.tsx streams the shell first; the page is marked noindex instead.
  await page.goto("/a/zzzz");
  await expect(page.getByRole("heading", { name: /No tokenized asset found for “ZZZZ”/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /NVDA/ })).toBeVisible();
});

test("the JSON API returns the ranked view", async ({ request }) => {
  const res = await request.get("/api/asset/nvda");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ranked.best.symbol).toBe("NVDAx");
  expect(body.dataMode).toBe("demo");
  expect((await request.get("/api/asset/zzzz")).status()).toBe(404);
});

test("the method page lists the endpoints", async ({ page }) => {
  await page.goto("/method");
  await expect(page.getByText("/v5/real-world-assets/quotes/latest")).toBeVisible();
});

test("the share image renders", async ({ request }) => {
  const res = await request.get("/a/nvda/opengraph-image");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("a percent sign in the ticker shows the not-found page, not an error", async ({ page, request }) => {
  await page.goto("/a/%25");
  await expect(page.getByRole("heading", { name: /No tokenized asset found for “%”/ })).toBeVisible();
  expect((await request.get("/api/asset/%25")).status()).toBe(404);
  expect((await request.get("/a/%25/opengraph-image")).status()).toBe(200);
});

test("pressing Enter before the search index has loaded still finds the asset", async ({ page }) => {
  await page.route("**/api/search-index", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/");
  await page.getByRole("combobox").fill("Nvidia");
  await page.getByRole("combobox").press("Enter");
  await expect(page).toHaveURL(/\/a\/nvda$/, { timeout: 10_000 });
});

test("the search recovers after the index failed to load once", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/search-index", async (route) => {
    calls += 1;
    if (calls === 1) await route.fulfill({ status: 503, body: "{}" });
    else await route.continue();
  });
  await page.goto("/");
  await page.getByRole("combobox").fill("nv");
  await expect(page.getByRole("option").first()).toContainText("NVDA");
});

test("derivatives price feeds are labelled and the stock venue is linked", async ({ page }) => {
  await page.goto("/a/gold");
  await expect(page.getByText("Derivative", { exact: true }).first()).toBeVisible();
  await page.goto("/a/nvda");
  await expect(page.getByTestId("tradfi-markets").getByRole("link", { name: /Binance/ })).toHaveAttribute(
    "href",
    "https://www.binance.com/en/stocks/EQ_NVDA",
  );
});

test("the disclaimer lives on a terms page, not in a big footer", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer).not.toContainText("it does not tell you to buy anything");
  await footer.getByRole("link", { name: "Terms of use" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Terms of use" })).toBeVisible();
  await expect(page.getByText("not financial advice", { exact: false }).first()).toBeVisible();
});
