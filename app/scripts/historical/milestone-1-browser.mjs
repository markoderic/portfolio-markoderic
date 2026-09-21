// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
// Uses a fresh browser profile, loopback only, and never submits contact messages.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.PROTOTYPE_URL || "http://127.0.0.1:5175";
assert.equal(new URL(base).hostname, "127.0.0.1");
const out = process.env.PROTOTYPE_EVIDENCE || "/tmp/portfolio-prototype-checks";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  failures = [],
  results = [];
page.on("pageerror", (e) => errors.push(String(e.stack || e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
});
const button = (name) => page.getByRole("button", { name, exact: true });
const click = (name) => button(name).click();
const menu = async (name, item) => {
  await click(name);
  await page.getByRole("menuitem", { name: item, exact: true }).click();
};
const region = (name) =>
  page.getByRole("region", { name: `${name} window`, exact: true });
const shown = async (name) => {
  await region(name).waitFor();
  assert(await region(name).isVisible(), `${name} window visible`);
};
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log(`PASS ${name}`);
};
try {
  await page.goto(`${base}/prototype.html`);
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(1000);
  await check("3D scene loads with no fallback", async () => {
    assert.equal(await page.locator(".scene-fallback").count(), 0);
    assert.equal(await page.locator("canvas").count(), 1);
  });
  await page.screenshot({ path: `${out}/01-desk.png` });
  await check(
    "physical laptop/phone clicks and phone desk-pose return",
    async () => {
      const clickDevice = async (selector) => {
        const box = await page.locator(selector).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      };
      await clickDevice(".laptop-host");
      await region("Projects").waitFor();
      await click("Back to desk");
      await page.waitForTimeout(1300);
      await clickDevice(".phone-host");
      await page.locator('.phone-host[data-enabled="true"]').waitFor();
      await click("Back to desk");
      await page.waitForTimeout(1300);
      await clickDevice(".phone-host");
      await page.locator('.phone-host[data-enabled="true"]').waitFor();
      await click("Back to desk");
    },
  );
  await check("desk → laptop → Projects", async () => {
    await click("Open laptop");
    await shown("Projects");
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/02-desktop.png` });
  await check("all four projects open genuine overview documents", async () => {
    for (const [id, name] of [
      ["animalfeed", "AnimalFeed"],
      ["film", "Personal branding film"],
      ["notch", "Notch"],
      ["portfolio", "This portfolio"],
    ]) {
      await page.locator(".project-row").filter({ hasText: name }).click();
      await shown(name);
      assert.equal(new URL(page.url()).hash, `#${id}`);
      await click("← All projects");
      await shown("Projects");
    }
  });
  await check(
    "window minimize removes content and focus; dock restores",
    async () => {
      await click("Minimize window");
      assert.equal(await region("Projects").count(), 0);
      await page.waitForFunction(
        () => !!document.activeElement.closest(".dock,.desktop-folder"),
      );
      await page.locator('.dock [data-launcher="projects"]').click();
      await shown("Projects");
    },
  );
  await check("maximize and restore", async () => {
    await click("Maximize window");
    assert(
      await page
        .locator(".desktop-window")
        .evaluate((e) => e.classList.contains("maximized")),
    );
    await click("Restore window size");
    assert(
      !(await page
        .locator(".desktop-window")
        .evaluate((e) => e.classList.contains("maximized"))),
    );
  });
  await check("File open resume and PDF links", async () => {
    await menu("File", "Open Resume");
    await shown("Resume");
    const pdf = page.getByRole("link", { name: "Open PDF" });
    const response = await page.request.get(
      new URL(await pdf.getAttribute("href"), base).href,
    );
    assert.equal(response.status(), 200);
    assert(response.headers()["content-type"].includes("application/pdf"));
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download resume ↓" }).click(),
    ]);
    assert.equal(download.suggestedFilename(), "Marko Deric Resume 2026.pdf");
  });
  await check("File menu download", async () => {
    await click("File");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page
        .getByRole("menuitem", { name: "Download Resume", exact: true })
        .click(),
    ]);
    assert.equal(download.suggestedFilename(), "Marko Deric Resume 2026.pdf");
  });
  await check("File close and reopen projects", async () => {
    await menu("File", "Close window");
    assert.equal(await region("Resume").count(), 0);
    await menu("File", "Open Projects");
    await shown("Projects");
  });
  await check("Edit find, actual highlights, clear, and Escape", async () => {
    await menu("Edit", "Find in document");
    await page.getByLabel("Find", { exact: true }).fill("project");
    assert((await page.locator("mark[data-find]").count()) > 0);
    await menu("Edit", "Clear find");
    assert.equal(await page.locator("mark[data-find]").count(), 0);
    await menu("Edit", "Find in document");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".find-bar").count(), 0);
  });
  await check(
    "menus keyboard arrows, focus restoration and Escape",
    async () => {
      await click("File");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        "Open Projects",
      );
      await page.keyboard.press("ArrowDown");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        "Open Resume",
      );
      await page.keyboard.press("Escape");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent),
        "File",
      );
      assert.equal(await page.getByRole("menu").count(), 0);
    },
  );
  await check("Help controls/about/contact and contact links", async () => {
    await menu("Help", "Controls & credits");
    await shown("Controls & credits");
    await menu("Help", "About Marko");
    await shown("About Marko");
    await click("Get in touch");
    await shown("Contact");
    assert.equal(
      await page
        .getByRole("link", { name: /markoderic04/ })
        .getAttribute("href"),
      "mailto:markoderic04@gmail.com",
    );
    assert.equal(
      await page
        .getByRole("link", { name: /Connect on LinkedIn/ })
        .getAttribute("href"),
      "https://www.linkedin.com/in/markoderic/",
    );
    await menu("Help", "Contact");
    await shown("Contact");
  });
  await check("Window switching and minimize", async () => {
    await menu("Window", "Projects");
    await shown("Projects");
    await menu("Window", "Minimize window");
    assert.equal(await region("Projects").count(), 0);
    await menu("Window", "Projects");
    await shown("Projects");
  });
  await check("View maximize/restore, desk and phone commands", async () => {
    await menu("View", "Maximize window");
    await menu("View", "Restore window size");
    await menu("View", "Show desk");
    assert(await page.locator(".intro").isVisible());
    await click("Open laptop");
    await menu("View", "Focus phone");
    await page.locator('.phone-host[data-enabled="true"]').waitFor();
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/03-phone.png` });
  await check(
    "phone scrolls, project navigation works, returns to desk",
    async () => {
      const scroll = page.locator(".phone-scroll");
      await scroll.evaluate((e) => {
        e.scrollTop = e.scrollHeight;
      });
      assert((await scroll.evaluate((e) => e.scrollTop)) > 0);
      await click("Read the Notch project →");
      await shown("Notch");
      await click("Pick up the Notch phone →");
      await click("Back to desk");
      assert(await page.locator(".intro").isVisible());
    },
  );
  await check("rapid interrupted navigation stays usable", async () => {
    for (let i = 0; i < 4; i++) {
      await click("Open laptop");
      await click("Pick up phone");
      await click("Back to desk");
    }
    await click("Open laptop");
    await shown("Notch");
    assert.equal(await page.locator(".scene-fallback").count(), 0);
  });
  await check("deep link reload and browser Back", async () => {
    await page.goto(`${base}/prototype.html#notch`);
    await shown("Notch");
    await click("← All projects");
    await shown("Projects");
    await page.goBack();
    await shown("Notch");
  });
  await check("no-3D mode keeps all destinations usable", async () => {
    await click("Use without 3D");
    assert.equal(await page.locator("canvas").count(), 0);
    await click("Back to desk");
    await click("View projects as a list ↗");
    await shown("Projects");
    await click("Pick up phone");
    await page.locator('.phone-host[data-enabled="true"]').waitFor();
    await click("Show 3D scene");
  });
  await check("manual and system reduced motion", async () => {
    await click("Motion: on");
    assert(
      await page
        .locator("main")
        .evaluate((e) => e.classList.contains("reduced")),
    );
    await click("Motion: off");
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert(await button("Reduced motion (system)").isDisabled());
    await click("Open laptop");
    assert.equal(
      await page
        .locator(".desktop")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
  });
  await check(
    "320/390/768 mobile layouts, menus and phone scroll",
    async () => {
      for (const width of [320, 390, 768]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${base}/prototype.html#projects`);
        await shown("Projects");
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await menu("Help", "Contact");
        await shown("Contact");
        await click("Pick up phone");
        await page.locator('.phone-host[data-enabled="true"]').waitFor();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await page.locator(".phone-scroll").evaluate((e) => {
          e.scrollTop = e.scrollHeight;
        });
        assert(
          await page.locator(".phone-scroll").evaluate((e) => e.scrollTop > 0),
        );
        if (width === 390) {
          await page.screenshot({ path: `${out}/04-mobile-phone.png` });
          await click("Open laptop");
          await page.screenshot({ path: `${out}/05-mobile-desktop.png` });
        }
      }
    },
  );
  await check("About actions and persistent Controls", async () => {
    await page.goto(`${base}/prototype.html#about`);
    await click("Explore projects");
    await shown("Projects");
    await menu("Help", "About Marko");
    await click("Read my resume");
    await shown("Resume");
    await click("Close window");
    await page.waitForFunction(
      () => !!document.activeElement.closest(".dock,.desktop-folder"),
    );
    await click("Controls");
    await shown("Controls & credits");
  });
  await check("film keyboard playback/pause and media-API seek", async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/prototype.html#film`);
    const video = page.locator("video");
    await page.waitForFunction(
      () => document.querySelector("video")?.readyState >= 1,
    );
    await video.press("Space");
    await page.waitForFunction(
      () =>
        !document.querySelector("video").paused &&
        document.querySelector("video").currentTime > 0.1,
    );
    await video.press("Space");
    assert(await video.evaluate((v) => v.paused));
    await video.evaluate((v) => {
      v.currentTime = 5;
    });
    await page.waitForFunction(
      () => document.querySelector("video").currentTime >= 4.9,
    );
    await video.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/08-film.png` });
  });
  await check("no runtime errors or failed local assets", async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
  });
  // Inspect the unchanged original entry in a different page so its diagnostics stay separate.
  const original = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const originalErrors = [];
  original.on("pageerror", (e) => originalErrors.push(e.message));
  await check("original production entry loads independently", async () => {
    const response = await original.goto(base + "/");
    assert.equal(response.status(), 200);
    await original.locator("main").waitFor();
    assert((await original.locator("body").innerText()).includes("Marko"));
    assert.equal(await original.locator(".prototype").count(), 0);
    await original.screenshot({ path: `${out}/06-original.png` });
  });
  await fs.writeFile(
    `${out}/results.json`,
    JSON.stringify(
      { passed: results.length, results, errors, failures, originalErrors },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      { passed: results.length, errors, failures, originalErrors, out },
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
  await browser.close();
}
