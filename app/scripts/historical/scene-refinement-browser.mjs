import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PROTOTYPE_URL || "http://127.0.0.1:5175";
assert.equal(new URL(base).hostname, "127.0.0.1");
const out =
  process.env.REFINEMENT_EVIDENCE || "/tmp/portfolio-screen-refinement";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: out, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
const errors = [],
  failures = [],
  checks = [],
  frames = [];
page.on("pageerror", (e) => errors.push(e.stack || String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
});
const click = (name) => page.getByRole("button", { name, exact: true }).click();
const settled = () =>
  page.waitForFunction(
    () => document.querySelector("main").dataset.transition === "settled",
  );
const capture = async (name) => {
  await page.screenshot({ path: `${out}/${name}.png` });
  frames.push({
    name,
    view: await page.locator("main").getAttribute("class"),
    transition: await page.locator("main").getAttribute("data-transition"),
    laptop: await page.locator(".laptop-host").boundingBox(),
    phone: await page.locator(".phone-host").boundingBox(),
  });
};
const check = async (name, fn) => {
  await fn();
  checks.push(name);
  console.log(`PASS ${name}`);
};
try {
  await page.goto(`${base}/prototype.html`);
  await page.locator("canvas").waitFor();
  await settled();
  const laptop = await page.locator(".desktop").elementHandle(),
    phone = await page.locator(".phone-reading").elementHandle();
  await capture("01-desk-1280");
  await click("Open laptop");
  await page.waitForTimeout(90);
  await capture("02-laptop-approach");
  await page.waitForTimeout(130);
  await capture("03-laptop-mid");
  await settled();
  await capture("04-laptop-settled-1280");
  await check("same desktop DOM persists from desk through focus", async () => {
    assert(
      await laptop.evaluate((e) => e === document.querySelector(".desktop")),
    );
    assert.equal(await page.locator(".desktop").count(), 1);
  });
  await check("four full project rows fit at 1280 × 720", async () => {
    const body = await page.locator(".document-scroll").boundingBox();
    const rows = await page.locator(".project-row").all();
    assert.equal(rows.length, 4);
    for (const row of rows) {
      const b = await row.boundingBox();
      assert(b.y >= body.y - 1 && b.y + b.height <= body.y + body.height + 1);
    }
  });
  await check("menu Escape returns focus to File", async () => {
    await click("File");
    await page.keyboard.press("Escape");
    assert.equal(
      await page.evaluate(() => document.activeElement.textContent),
      "File",
    );
  });
  await check(
    "active project and document scroll survive desk round trip",
    async () => {
      await page
        .locator(".project-row")
        .filter({ hasText: "This portfolio" })
        .click();
      await page.locator(".document-scroll").evaluate((e) => {
        e.scrollTop = 80;
      });
      const scroll = await page
        .locator(".document-scroll")
        .evaluate((e) => e.scrollTop);
      await click("Back to desk");
      await settled();
      assert(
        await laptop.evaluate((e) => e.textContent.includes("This portfolio")),
      );
      assert(await page.locator(".laptop-host").evaluate((e) => e.inert));
      await capture("05-laptop-return-with-project");
      await click("Open laptop");
      await settled();
      assert(
        await page
          .getByRole("region", { name: "This portfolio window", exact: true })
          .isVisible(),
      );
      assert.equal(
        await page.locator(".document-scroll").evaluate((e) => e.scrollTop),
        scroll,
      );
    },
  );
  await click("Pick up phone");
  await page.waitForTimeout(90);
  await capture("06-phone-lift");
  await page.waitForTimeout(150);
  await capture("07-phone-mid");
  await settled();
  await capture("08-phone-settled-1280");
  await check(
    "same phone DOM and a single handset screen throughout pickup",
    async () => {
      assert(
        await phone.evaluate(
          (e) => e === document.querySelector(".phone-reading"),
        ),
      );
      assert.equal(await page.locator(".phone-reading").count(), 1);
      assert.equal(await page.locator(".phone-focus").count(), 0);
    },
  );
  await check(
    "phone pose is stable while scrolling and resumes after return",
    async () => {
      const transform = await page.locator(".phone-host").getAttribute("style");
      await page.locator(".phone-scroll").evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      const scroll = await page
        .locator(".phone-scroll")
        .evaluate((e) => e.scrollTop);
      assert(scroll > 0);
      await page.waitForTimeout(180);
      assert.equal(
        await page.locator(".phone-host").getAttribute("style"),
        transform,
      );
      await capture("09-phone-scrolled");
      await click("Back to desk");
      await page.waitForTimeout(130);
      await capture("10-phone-return-mid");
      await settled();
      await capture("11-phone-return-desk");
      await click("Pick up phone");
      await settled();
      assert.equal(
        await page.locator(".phone-scroll").evaluate((e) => e.scrollTop),
        scroll,
      );
    },
  );
  await check(
    "both directions and rapid retargeting preserve working controls",
    async () => {
      for (const name of [
        "Open laptop",
        "Pick up phone",
        "Back to desk",
        "Pick up phone",
        "Open laptop",
        "Back to desk",
        "Open laptop",
        "Pick up phone",
        "Open laptop",
      ]) {
        await click(name);
        await page.waitForTimeout(55);
      }
      await settled();
      await click("File");
      await page
        .getByRole("menuitem", { name: "Open Projects", exact: true })
        .click();
      assert(
        await page
          .getByRole("region", { name: "Projects window", exact: true })
          .isVisible(),
      );
    },
  );
  await check(
    "resize during motion settles at 1440 × 900 with four rows visible",
    async () => {
      await click("Back to desk");
      await page.waitForTimeout(100);
      await click("Open laptop");
      await page.waitForTimeout(80);
      await page.setViewportSize({ width: 1440, height: 900 });
      await settled();
      const b = await page.locator(".laptop-host").boundingBox();
      assert(
        b.x >= 0 && b.x + b.width <= 1440 && b.y >= 50 && b.y + b.height < 800,
      );
      const body = await page.locator(".document-scroll").boundingBox();
      for (const row of await page.locator(".project-row").all()) {
        const r = await row.boundingBox();
        assert(r.y + r.height <= body.y + body.height + 1);
      }
      await capture("12-laptop-settled-1440");
      await click("Back to desk");
      await settled();
      await capture("13-desk-1440");
    },
  );
  await check(
    "keyboard-only device entry moves focus after settling",
    async () => {
      await page
        .getByRole("button", { name: "Open laptop", exact: true })
        .focus();
      await page.keyboard.press("Enter");
      await settled();
      await page.waitForFunction(() =>
        document.activeElement.matches(".window-bar h2"),
      );
      await click("Minimize window");
      await page.waitForFunction(
        () => !!document.activeElement.closest(".dock,.desktop-folder"),
      );
    },
  );
  await check("reduced motion uses direct readable screen", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await click("Open laptop");
    assert(
      await page
        .locator("main")
        .evaluate((e) => e.classList.contains("direct-view")),
    );
    assert.equal(
      await page
        .locator(".laptop-host")
        .evaluate((e) => getComputedStyle(e).transform),
      "none",
    );
    await capture("14-reduced-motion");
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });
  await check(
    "no-3D mode retains documents and hides inactive surfaces",
    async () => {
      await click("Use without 3D");
      assert.equal(await page.locator("canvas").count(), 0);
      await click("Back to desk");
      assert.equal(
        await page
          .locator(".laptop-host")
          .evaluate((e) => getComputedStyle(e).visibility),
        "hidden",
      );
      await click("View projects as a list ↗");
      assert(
        await page
          .getByRole("region", { name: "Projects window", exact: true })
          .isVisible(),
      );
      await capture("15-without-3d");
      await click("Show 3D scene");
    },
  );
  await check(
    "390px mobile direct views remain readable and scrollable",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await click("Open laptop");
      await capture("16-mobile-projects");
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth === innerWidth,
        ),
      );
      await click("Pick up phone");
      await capture("17-mobile-phone");
      await page.locator(".phone-scroll").evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      assert(
        await page.locator(".phone-scroll").evaluate((e) => e.scrollTop > 0),
      );
      await click("Read the Notch project →");
      assert(
        await page
          .getByRole("region", { name: "Notch window", exact: true })
          .isVisible(),
      );
    },
  );
  await check("no runtime errors or failed assets", async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });
  await fs.writeFile(
    `${out}/results.json`,
    JSON.stringify(
      { passed: checks.length, checks, errors, failures, frames },
      null,
      2,
    ),
  );
} catch (e) {
  await page.screenshot({ path: `${out}/failure.png` });
  console.error(e);
  console.error({ errors, failures });
  process.exitCode = 1;
} finally {
  const video = page.video();
  await context.close();
  if (video)
    await fs.rename(await video.path(), `${out}/desk-device-continuity.webm`);
  await browser.close();
}
