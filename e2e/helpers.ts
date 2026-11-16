import { test as base, expect, type Locator, type Page } from "@playwright/test";

// Test-specific page.route handlers take precedence over this fallback. An
// unexpected AI request must fail locally instead of reaching a real provider.
export const test = base.extend({
  page: async ({ page }, runTest) => {
    const unexpectedRequests: string[] = [];
    await page.route(/\/api\/(lesson|narration|ask)(?:\?.*)?$/, async (route) => {
      unexpectedRequests.push(new URL(route.request().url()).pathname);
      await route.abort("blockedbyclient");
    });
    await runTest(page);
    expect(unexpectedRequests, "All AI requests must have an explicit mock").toEqual([]);
  },
});

export { expect };

export async function openSolarDemo(page: Page) {
  await page.getByRole("button", { name: /The planets of our solar system/ }).click();
  await expect(page.getByRole("heading", { name: "The Planets of Our Solar System", exact: true })).toBeVisible();
  const player = page.getByRole("region", { name: "Lesson player" });
  await expect(player.getByRole("button", { name: "Start lesson", exact: true })).toBeVisible();
  return player;
}

export function captionIn(player: Locator) {
  // Captions expose a full sentence to screen readers and separate visual words,
  // but have no dedicated role or label. Scope this selector to the player.
  return player.locator("p:has(> span.sr-only)");
}

export async function drawnPathCount(board: Locator) {
  return board.locator("path[stroke-dashoffset]").evaluateAll((paths) =>
    paths.filter((path) => Number(path.getAttribute("stroke-dashoffset")) < 1).length,
  );
}
