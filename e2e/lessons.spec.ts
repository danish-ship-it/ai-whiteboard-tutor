import pythagoras from "../src/lib/demos/pythagoras.json";
import { captionIn, drawnPathCount, expect, openSolarDemo, test } from "./helpers";

test("demo playback draws the board and supports speed and captions controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Watch one now", { exact: true })).toBeVisible();
  const demos = page.getByRole("list").filter({
    has: page.getByRole("button", { name: /The planets of our solar system/ }),
  });
  await expect(demos.getByRole("listitem")).toHaveCount(3);
  for (const name of [
    /The planets of our solar system/,
    /How photosynthesis works/,
    /The Pythagorean theorem/,
  ]) {
    await expect(demos.getByRole("button", { name })).toBeVisible();
  }

  const player = await openSolarDemo(page);
  const board = player.getByRole("img", { name: /^Whiteboard:/ });
  const timeline = player.getByRole("slider", { name: "Lesson timeline" });
  const initialTime = Number(await timeline.inputValue());
  // The scene title already has an underline before playback starts.
  const initialPaths = await drawnPathCount(board);

  await player.getByRole("button", { name: "Start lesson", exact: true }).click();
  await expect(player.getByRole("button", { name: "Pause lesson", exact: true })).toBeVisible();
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(initialTime + 2);
  await expect.poll(() => drawnPathCount(board)).toBeGreaterThan(initialPaths);
  await expect(captionIn(player)).toBeVisible();
  await expect(captionIn(player)).toContainText(/\S/);
  // Demo lessons ship a Runway clip for each step beside the board.
  const visual = page.getByRole("region", { name: "See it for real" });
  await expect(visual.locator("video")).toHaveAttribute("src", /\/demos\/visuals\/.+-s1\.mp4$/);

  await player.getByRole("button", { name: "Playback speed, 1×", exact: true }).click();
  await player.getByRole("menuitemradio", { name: "0.75×", exact: true }).click();
  const speed = player.getByRole("button", { name: "Playback speed, 0.75×", exact: true });
  await expect(speed).toBeVisible();
  await speed.click();
  await expect(player.getByRole("menuitemradio", { name: "0.75×", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  const timeAtNewSpeed = Number(await timeline.inputValue());
  await expect.poll(async () => Number(await timeline.inputValue())).toBeGreaterThan(timeAtNewSpeed + 0.5);

  // Pause so the same sentence can be checked before and after the toggle.
  await player.getByRole("button", { name: "Pause lesson", exact: true }).click();
  await expect(player.getByRole("button", { name: "Play lesson", exact: true })).toBeVisible();
  const captionText = await captionIn(player).innerText();
  await player.getByRole("button", { name: "Hide captions", exact: true }).click();
  await expect(captionIn(player)).toBeHidden();
  await player.getByRole("button", { name: "Show captions", exact: true }).click();
  await expect(captionIn(player)).toBeVisible();
  await expect(captionIn(player)).toHaveText(captionText, { useInnerText: true });
});

test("a generated lesson plays with captions when narration fails", async ({ page }) => {
  const voiceError = "Narration is temporarily unavailable.";
  await page.route("**/api/lesson", (route) => route.fulfill({
    json: { lesson: pythagoras.lesson, token: "mock-pythagoras-token" },
  }));
  await page.route("**/api/narration", (route) => route.fulfill({
    status: 502,
    json: { error: voiceError },
  }));

  await page.goto("/");
  await page.getByRole("textbox", { name: "What do you want to learn?", exact: true }).fill("Explain the Pythagorean theorem");
  await page.getByRole("button", { name: "Make a lesson", exact: true }).click();
  await expect(page.getByRole("heading", { name: pythagoras.lesson.title, exact: true })).toBeVisible();
  const notice = page.getByRole("alert").filter({ hasText: "The voice couldn’t load." });
  await expect(notice).toContainText("The voice couldn’t load.");
  await expect(notice).toContainText(voiceError);
  await notice.getByRole("button", { name: "Continue with captions", exact: true }).click();

  await expect(notice).toBeHidden();
  const player = page.getByRole("region", { name: "Lesson player" });
  await expect(player.getByRole("button", { name: "Pause lesson", exact: true })).toBeVisible();
  await expect.poll(async () => Number(await player.getByRole("slider", { name: "Lesson timeline" }).inputValue())).toBeGreaterThan(0.5);
  await expect(captionIn(player)).toBeVisible();
  await expect(captionIn(player)).toContainText(pythagoras.lesson.scenes[0].beats[0].sentence);
});

test("cancelling a pending lesson returns home with the topic preserved", async ({ page }) => {
  const topic = "Why is the sky blue?";
  let lessonRequested = false;
  await page.route("**/api/lesson", () => {
    lessonRequested = true;
    // Deliberately leave the request pending until the learner cancels it.
  });

  await page.goto("/");
  await page.getByRole("textbox", { name: "What do you want to learn?", exact: true }).fill(topic);
  await page.getByRole("button", { name: "Make a lesson", exact: true }).click();
  await expect.poll(() => lessonRequested).toBe(true);
  await expect(page.getByRole("list", { name: "Lesson progress" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await expect(page.getByRole("heading", { name: "What do you want to learn?", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "What do you want to learn?", exact: true })).toHaveValue(topic);
  await expect(page.getByRole("list", { name: "Lesson progress" })).toBeHidden();
});

test("a demo follow-up conversation is shared between desktop and the mobile sheet", async ({ page }) => {
  const question = "Why do the planets stay in orbit?";
  const answer = "The Sun’s gravity keeps the planets in orbit.";
  let askRequests = 0;
  await page.route("**/api/ask", (route) => {
    askRequests++;
    return route.fulfill({
      // These elements belong to the solar-system demo's first scene.
      json: { answer, highlight: ["sun1", "grav"], sceneId: "s1" },
    });
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await openSolarDemo(page);
  const desktop = page.getByRole("region", { name: "Questions", exact: true });
  await desktop.getByRole("textbox", { name: "Ask about this lesson", exact: true }).fill(question);
  await desktop.getByRole("button", { name: "Send question", exact: true }).click();
  await expect(desktop.getByText(question, { exact: true })).toBeVisible();
  await expect(desktop.getByText(answer, { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Ask a question", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Questions", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText(question, { exact: true })).toBeVisible();
  await expect(sheet.getByText(answer, { exact: true })).toBeVisible();
  expect(askRequests).toBe(1);
});
