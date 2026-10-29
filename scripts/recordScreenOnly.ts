/**
 * @fileoverview Automated Human-Paced Screen-Only Demo Recorder.
 * Records the running Next.js application at 1920x1080 with a smooth human cursor,
 * choreographed 6-scene walkthrough, and converts to a crisp 1080p MP4.
 */

import { chromium, type Page, type BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ffmpegStatic: string = require('ffmpeg-static');

const DEMO_OUTPUT_DIR = path.resolve(process.cwd(), 'demo-output');
const RAW_OUTPUT_DIR = path.resolve(DEMO_OUTPUT_DIR, 'raw');
const FINAL_MP4_PATH = path.resolve(DEMO_OUTPUT_DIR, 'EventForge-Screen-Only.mp4');

// Ensure output directories exist
if (!fs.existsSync(DEMO_OUTPUT_DIR)) {
  fs.mkdirSync(DEMO_OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(RAW_OUTPUT_DIR)) {
  fs.mkdirSync(RAW_OUTPUT_DIR, { recursive: true });
}

// Global cursor tracker position
let cursorX = 960;
let cursorY = 540;

/**
 * Injects a constant 60fps requestAnimationFrame loop so Chromium's video
 * recorder does not drop frames or stutter during pauses.
 */
async function injectFrameRateKeeper(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.getElementById('pw-framerate-keeper')) return;
    const div = document.createElement('div');
    div.id = 'pw-framerate-keeper';
    div.style.cssText =
      'position:fixed;bottom:0;right:0;width:2px;height:2px;opacity:0.02;pointer-events:none;z-index:99999999;';
    document.body.appendChild(div);

    function tick() {
      div.style.transform = `translateX(${Math.sin(Date.now() / 150)}px)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

/**
 * Injects a visible 18px human cursor dot with click ripple animations.
 */
async function injectHumanCursor(page: Page): Promise<void> {
  await page.evaluate(() => {
    if (document.getElementById('pw-human-cursor')) return;

    const style = document.createElement('style');
    style.id = 'pw-cursor-styles';
    style.innerHTML = `
      #pw-human-cursor {
        position: fixed;
        width: 18px;
        height: 18px;
        background: #5c3beb;
        border: 2.5px solid #ffffff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999999;
        transform: translate(-50%, -50%);
        transition: width 0.12s, height 0.12s, background-color 0.12s;
        box-shadow: 0 4px 12px rgba(92, 59, 235, 0.45), 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      .pw-click-ripple {
        position: fixed;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid #5c3beb;
        pointer-events: none;
        z-index: 9999998;
        transform: translate(-50%, -50%) scale(0.2);
        opacity: 0.9;
        animation: pwRipple 0.45s ease-out forwards;
      }
      @keyframes pwRipple {
        to {
          transform: translate(-50%, -50%) scale(1.6);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);

    const cursor = document.createElement('div');
    cursor.id = 'pw-human-cursor';
    cursor.style.left = '960px';
    cursor.style.top = '540px';
    document.body.appendChild(cursor);

    (window as any).__updateCursor = (x: number, y: number) => {
      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
    };

    (window as any).__triggerRipple = (x: number, y: number) => {
      const ripple = document.createElement('div');
      ripple.className = 'pw-click-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    };
  });
}

/**
 * Smoothly moves the mouse in natural interpolated micro-steps with easing.
 */
async function smoothMove(
  page: Page,
  targetX: number,
  targetY: number,
  durationMs: number = 320
): Promise<void> {
  const steps = 22;
  const stepDelay = durationMs / steps;
  const startX = cursorX;
  const startY = cursorY;

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - t, 3);
    const currX = startX + (targetX - startX) * ease;
    const currY = startY + (targetY - startY) * ease;

    await page.mouse.move(currX, currY);
    await page.evaluate(
      ({ x, y }) => {
        if ((window as any).__updateCursor) (window as any).__updateCursor(x, y);
      },
      { x: currX, y: currY }
    );
    await page.waitForTimeout(stepDelay);
  }

  cursorX = targetX;
  cursorY = targetY;
}

/**
 * Human-paced click on a selector or current position with visual ripple.
 */
async function humanClick(page: Page, selector?: string): Promise<void> {
  if (selector) {
    const el = page.locator(selector).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await el.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await smoothMove(page, targetX, targetY, 320);
    }
  }

  await page.waitForTimeout(100);
  await page.evaluate(
    ({ x, y }) => {
      if ((window as any).__triggerRipple) (window as any).__triggerRipple(x, y);
    },
    { x: cursorX, y: cursorY }
  );
  await page.mouse.down();
  await page.waitForTimeout(90);
  await page.mouse.up();
  await page.waitForTimeout(200);
}

/**
 * Smoothly scrolls the window by deltaY over multiple frames.
 */
async function smoothScroll(page: Page, deltaY: number, steps: number = 20): Promise<void> {
  const stepDelta = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepDelta);
    await page.waitForTimeout(25);
  }
}

/**
 * Converts recorded webm to 1080p MP4 using ffmpeg-static.
 */
function convertToMp4(rawWebmPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`[FFmpeg] Converting ${rawWebmPath} -> ${outputPath}...`);

    const args = [
      '-y',
      '-i',
      rawWebmPath,
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      outputPath,
    ];

    const proc = spawn(ffmpegStatic, args, { stdio: 'inherit' });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`[FFmpeg] Video successfully rendered: ${outputPath}`);
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function runDemoRecording() {
  console.log('[Recorder] Launching Playwright Chromium in 1920x1080...');

  const browser = await chromium.launch({
    headless: true,
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: RAW_OUTPUT_DIR,
      size: { width: 1920, height: 1080 },
    },
  });

  const page = await context.newPage();

  console.log('[Recorder] Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await injectFrameRateKeeper(page);
  await injectHumanCursor(page);

  // =========================================================================
  // SCENE 0: Full-Screen Intro Card (4 Seconds)
  // =========================================================================
  console.log('[Scene 0] Displaying Title Card...');
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.id = 'demo-title-card';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(circle at 50% 40%, #1e1b4b 0%, #0f172a 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999999;
      color: #ffffff;
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
      padding: 40px;
      transition: opacity 0.8s ease-in-out;
    `;
    overlay.innerHTML = `
      <div style="width: 80px; height: 80px; border-radius: 26px; background: linear-gradient(135deg, #5c3beb, #8c67fa); display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 36px rgba(92, 59, 235, 0.4); margin-bottom: 24px;">
        <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
          <rect x="6" y="9" width="20" height="19" rx="3.5" stroke="white" stroke-width="2.2" fill="white" fill-opacity="0.12"/>
          <path d="M6 14.5H26" stroke="white" stroke-width="1.8"/>
          <path d="M11 6.5V9.5M21 6.5V9.5" stroke="white" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M7 27L17.5 16.5" stroke="white" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M21 7.5L22.2 10.8L25.8 11.2L23 13.5L23.8 17L20.8 15.2L17.8 17L18.6 13.5L15.8 11.2L19.4 10.8L21 7.5Z" fill="white"/>
          <circle cx="23.5" cy="23.5" r="4.8" stroke="white" stroke-width="2" fill="#5c3beb"/>
          <path d="M23.5 21V23.5L25.5 24.8" stroke="white" stroke-width="1.6"/>
        </svg>
      </div>
      <h1 style="font-size: 52px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 12px 0;">EventForge AI / HappyTimes</h1>
      <p style="font-size: 22px; color: #cbd5e1; font-weight: 400; max-width: 680px; margin: 0 0 28px 0; line-height: 1.5;">
        GenAI Event Architecture Studio • Dynamic Budgets • Dual Timelines • Vendor Due-Diligence
      </p>
      <div style="display: flex; gap: 12px;">
        <span style="font-size: 13px; font-weight: 700; background: rgba(92, 59, 235, 0.25); color: #c7d2fe; border: 1px solid rgba(165, 180, 252, 0.3); padding: 8px 18px; rounded-full: 9999px; border-radius: 9999px;">
          Weddings • Birthdays • Community Fairs
        </span>
        <span style="font-size: 13px; font-weight: 700; background: rgba(16, 185, 129, 0.2); color: #a7f3d0; border: 1px solid rgba(110, 231, 183, 0.3); padding: 8px 18px; border-radius: 9999px;">
          WCAG 2.1 AA • Zero-Token Math
        </span>
      </div>
    `;
    document.body.appendChild(overlay);
  });

  await page.waitForTimeout(3200);

  // Smooth fade-out of intro overlay
  await page.evaluate(() => {
    const el = document.getElementById('demo-title-card');
    if (el) el.style.opacity = '0';
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const el = document.getElementById('demo-title-card');
    if (el) el.remove();
  });
  await injectHumanCursor(page);

  // =========================================================================
  // SCENE 1: Hover Across Event Types & Click Wedding Preset (15 Seconds)
  // =========================================================================
  console.log('[Scene 1] Exploring presets and choosing Wedding...');
  await smoothMove(page, 960, 420, 600);
  await page.waitForTimeout(1000);

  // Scroll to presets section
  await smoothScroll(page, 280, 15);
  await page.waitForTimeout(800);

  // Hover Birthday preset
  await smoothMove(page, 960, 380, 500);
  await page.waitForTimeout(1200);

  // Hover Community Fair preset
  await smoothMove(page, 1340, 380, 500);
  await page.waitForTimeout(1200);

  // Return to Wedding Preset (1st card) and click "Apply This Scenario"
  console.log('[Scene 1] Applying Wedding Scenario...');
  const weddingPresetBtn = page.locator('button[aria-label*="Rustic Autumn Wedding"]').first();
  await weddingPresetBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const weddingBox = await weddingPresetBtn.boundingBox();
  if (weddingBox) {
    await smoothMove(page, weddingBox.x + weddingBox.width / 2, weddingBox.y + weddingBox.height / 2, 500);
    await humanClick(page);
  }

  await page.waitForTimeout(1200);

  // Scroll to submit button
  await smoothScroll(page, 650, 20);
  await page.waitForTimeout(800);

  // Click Generate Plan button
  const submitBtn = page.locator('button[type="submit"]:has-text("Generate Event Plan")').first();
  await submitBtn.scrollIntoViewIfNeeded();
  const submitBox = await submitBtn.boundingBox();
  if (submitBox) {
    await smoothMove(page, submitBox.x + submitBox.width / 2, submitBox.y + submitBox.height / 2, 450);
    await humanClick(page);
  }

  // Wait for plan synthesis and workbench rendering
  console.log('[Scene 1] Synthesizing event architecture...');
  await page.waitForSelector('text=Dynamic Budget Allocator', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // =========================================================================
  // SCENE 2: Budget Tracker, Lock Toggles & Over-Budget Variance (20 Seconds)
  // =========================================================================
  console.log('[Scene 2] Demonstrating Budget Tracker & Rebalancing...');
  // Scroll to summary banner & budget tracker
  await smoothScroll(page, -300, 15);
  await page.waitForTimeout(800);

  // Hover over the total cap & allocated KPI cards
  await smoothMove(page, 550, 360, 500);
  await page.waitForTimeout(1000);
  await smoothMove(page, 850, 360, 500);
  await page.waitForTimeout(1000);

  // Toggle lock on first category (Venue/Catering)
  console.log('[Scene 2] Locking Venue/Catering category...');
  const firstLockBtn = page.locator('button[aria-label*="Lock"]').first();
  if (await firstLockBtn.isVisible()) {
    const lockBox = await firstLockBtn.boundingBox();
    if (lockBox) {
      await smoothMove(page, lockBox.x + lockBox.width / 2, lockBox.y + lockBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1200);

  // Adjust percentage slider on second category (Photography)
  console.log('[Scene 2] Adjusting slider to show proportional rebalancing...');
  const slider = page.locator('input[type="range"]').nth(1);
  if (await slider.isVisible()) {
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      // Glide along slider
      await smoothMove(page, sliderBox.x + sliderBox.width * 0.3, sliderBox.y + sliderBox.height / 2, 400);
      await humanClick(page);
      await page.waitForTimeout(600);
      await smoothMove(page, sliderBox.x + sliderBox.width * 0.55, sliderBox.y + sliderBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);

  // Enter actual spend in Photography to trigger over-budget variance badge
  console.log('[Scene 2] Triggering over-budget variance badge...');
  const actualInput = page.locator('input[aria-label*="Actual spend"]').nth(1);
  if (await actualInput.isVisible()) {
    const inputBox = await actualInput.boundingBox();
    if (inputBox) {
      await smoothMove(page, inputBox.x + inputBox.width / 2, inputBox.y + inputBox.height / 2, 350);
      await humanClick(page);
      await actualInput.fill('8500');
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForTimeout(2000);

  // =========================================================================
  // SCENE 3: Dual Timelines, Vendor Checklist & Creative Ideas (25 Seconds)
  // =========================================================================
  console.log('[Scene 3] Switching to Dual Timelines...');
  // Scroll to top nav tabs
  await smoothScroll(page, -500, 15);
  await page.waitForTimeout(600);

  // Click Dual Timelines tab
  const timelineTab = page.locator('button[role="tab"]:has-text("Dual Timelines")').first();
  if (await timelineTab.isVisible()) {
    const tabBox = await timelineTab.boundingBox();
    if (tabBox) {
      await smoothMove(page, tabBox.x + tabBox.width / 2, tabBox.y + tabBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);

  // Inspect Countdown Roadmap
  await smoothScroll(page, 200, 12);
  await page.waitForTimeout(1500);

  // Toggle Day-Of Run-of-Show view
  console.log('[Scene 3] Viewing Day-Of Run-of-Show...');
  const dayOfBtn = page.locator('button[role="tab"]:has-text("Day-Of Run-of-Show")').first();
  if (await dayOfBtn.isVisible()) {
    const dayBox = await dayOfBtn.boundingBox();
    if (dayBox) {
      await smoothMove(page, dayBox.x + dayBox.width / 2, dayBox.y + dayBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(2000);

  // Switch to Vendor Checklist tab
  console.log('[Scene 3] Navigating to Vendor Checklist...');
  await smoothScroll(page, -300, 12);
  const vendorTab = page.locator('button[role="tab"]:has-text("Vendor Checklist")').first();
  if (await vendorTab.isVisible()) {
    const vBox = await vendorTab.boundingBox();
    if (vBox) {
      await smoothMove(page, vBox.x + vBox.width / 2, vBox.y + vBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);

  // Check off first vendor item
  console.log('[Scene 3] Checking off vendor checklist items...');
  const firstVendorCheckbox = page.locator('button[aria-label*="Mark"]').first();
  if (await firstVendorCheckbox.isVisible()) {
    const check1 = await firstVendorCheckbox.boundingBox();
    if (check1) {
      await smoothMove(page, check1.x + check1.width / 2, check1.y + check1.height / 2, 350);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1000);

  // Check off second vendor item
  const secondVendorCheckbox = page.locator('button[aria-label*="Mark"]').nth(1);
  if (await secondVendorCheckbox.isVisible()) {
    const check2 = await secondVendorCheckbox.boundingBox();
    if (check2) {
      await smoothMove(page, check2.x + check2.width / 2, check2.y + check2.height / 2, 350);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1200);

  // Expand vendor due-diligence questions
  console.log('[Scene 3] Expanding interview due-diligence questions...');
  const questionsBtn = page.locator('button:has-text("Due-Diligence Questions")').first();
  if (await questionsBtn.isVisible()) {
    const qBox = await questionsBtn.boundingBox();
    if (qBox) {
      await smoothMove(page, qBox.x + qBox.width / 2, qBox.y + qBox.height / 2, 350);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1800);

  // Switch to Ideas Studio tab
  console.log('[Scene 3] Navigating to Ideas Studio...');
  const ideasTab = page.locator('button[role="tab"]:has-text("Ideas Studio")').first();
  if (await ideasTab.isVisible()) {
    const iBox = await ideasTab.boundingBox();
    if (iBox) {
      await smoothMove(page, iBox.x + iBox.width / 2, iBox.y + iBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);
  await smoothScroll(page, 250, 15);
  await page.waitForTimeout(2000);

  // =========================================================================
  // SCENE 4: Security & Telemetry Drawer (15 Seconds)
  // =========================================================================
  console.log('[Scene 4] Scrolling to Telemetry Bar...');
  await smoothScroll(page, 700, 20);
  await page.waitForTimeout(1000);

  // Open Telemetry Drawer
  const telemetryBtn = page.locator('button:has-text("Security & Guardrails Audit Telemetry")').first();
  if (await telemetryBtn.isVisible()) {
    const tBox = await telemetryBtn.boundingBox();
    if (tBox) {
      await smoothMove(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);

  // Hover over PII redaction and deterministic latency badges
  await smoothScroll(page, 200, 10);
  await page.waitForTimeout(2500);

  // =========================================================================
  // SCENE 5: Accessibility Keyboard Focus & Exports (15 Seconds)
  // =========================================================================
  console.log('[Scene 5] Demonstrating Accessibility Keyboard Tab Navigation...');
  await smoothScroll(page, -800, 20);
  await page.waitForTimeout(800);

  // Switch back to Budget tab
  const budgetTab = page.locator('button[role="tab"]:has-text("Budget Tracker")').first();
  if (await budgetTab.isVisible()) {
    const bBox = await budgetTab.boundingBox();
    if (bBox) {
      await smoothMove(page, bBox.x + bBox.width / 2, bBox.y + bBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1000);

  // Press Tab 4 times to highlight visible accessible focus rings
  for (let t = 0; t < 4; t++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(1000);

  // Click Export CSV button
  console.log('[Scene 5] Triggering Budget CSV Export...');
  const exportCsvBtn = page.locator('button:has-text("Export CSV")').first();
  if (await exportCsvBtn.isVisible()) {
    const csvBox = await exportCsvBtn.boundingBox();
    if (csvBox) {
      await smoothMove(page, csvBox.x + csvBox.width / 2, csvBox.y + csvBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1500);

  // Switch to Timeline & trigger .ICS Export
  console.log('[Scene 5] Triggering Timeline .ICS Export...');
  const timelineTabAgain = page.locator('button[role="tab"]:has-text("Dual Timelines")').first();
  if (await timelineTabAgain.isVisible()) {
    const tBox = await timelineTabAgain.boundingBox();
    if (tBox) {
      await smoothMove(page, tBox.x + tBox.width / 2, tBox.y + tBox.height / 2, 350);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(1000);

  const exportIcsBtn = page.locator('button:has-text("Export .ICS")').first();
  if (await exportIcsBtn.isVisible()) {
    const icsBox = await exportIcsBtn.boundingBox();
    if (icsBox) {
      await smoothMove(page, icsBox.x + icsBox.width / 2, icsBox.y + icsBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(2000);

  // Final celebratory Party Burst trigger
  console.log('[Scene 5] Triggering Party Burst celebratory confetti...');
  const partyBurstBtn = page.locator('button:has-text("Party Burst")').first();
  if (await partyBurstBtn.isVisible()) {
    const pBox = await partyBurstBtn.boundingBox();
    if (pBox) {
      await smoothMove(page, pBox.x + pBox.width / 2, pBox.y + pBox.height / 2, 400);
      await humanClick(page);
    }
  }
  await page.waitForTimeout(3000);

  console.log('[Recorder] Closing browser context and capturing raw video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the raw video recorded by Playwright
  const rawFiles = fs.readdirSync(RAW_OUTPUT_DIR).filter((f) => f.endsWith('.webm'));
  if (rawFiles.length === 0) {
    throw new Error('No raw .webm video found in ' + RAW_OUTPUT_DIR);
  }

  const latestRawFile = path.resolve(RAW_OUTPUT_DIR, rawFiles[rawFiles.length - 1]);
  console.log(`[Recorder] Found raw recording: ${latestRawFile}`);

  // Convert to final 1080p MP4
  await convertToMp4(latestRawFile, FINAL_MP4_PATH);

  console.log(`[Recorder] Final demo video saved to: ${FINAL_MP4_PATH}`);
}

runDemoRecording().catch((err) => {
  console.error('[Recorder Error]:', err);
  process.exit(1);
});
