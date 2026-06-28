# Helix &mdash; High-Density Enterprise RPA Monitor

Helix is a state-of-the-art, high-density real-time Robotic Process Automation (RPA) control terminal built with **React, Vite, TypeScript, and Tailwind CSS (v4)**. It monitors over 50,000 active projects, departments, and robots deployments with millisecond-level precision.

---

## 🚀 Core Architecture Constraints

- **Zero External Table/Virtualization Libraries**: No AG-Grid, TanStack Table, `react-window`, or `react-virtualized`. All virtualization, scroll listening, element recycling, and DOM translation are implemented from scratch using raw Web APIs.
- **Zero-React-Render Telemetry**: Stream ticks arrive every 200ms. Grid cells, live counter metrics, and analytics bars are updated using direct DOM ref mutations, bypassing React's virtual DOM reconciliation completely.
- **Hardware-Accelerated Layering**: Promotes row elements to GPU compositor layers via `will-change` hints to achieve silky-smooth 60fps scrolling.

---

## 🛠️ Project Structure & Key Files

- [dataStream.js](file:///c:/c_backup/projects/helix/public/dataStream.js): Pre-built simulation engine aligned with the RPA database columns. Emits batches of 5–50 rows every 200ms, injecting standard telemetry noise and critical Failed/negative-ROI anomalies.
- [StateEngine.ts](file:///c:/c_backup/projects/helix/src/lib/StateEngine.ts): Singleton state manager that processes stream merges, buffers incoming ticks when paused, runs categorical filter isolation, and handles stable multi-column sorting.
- [VirtualGrid.tsx](file:///c:/c_backup/projects/helix/src/components/VirtualGrid.tsx): Custodial virtualization grid creating exactly $N = \text{viewportHeight}/40 + 2$ absolute-positioned rows, recycling text content and class states on scroll.
- [KPIStrip.tsx](file:///c:/c_backup/projects/helix/src/components/KPIStrip.tsx): Top-level KPI strip with direct ref textContent mutations.
- [AnalyticsChart.tsx](file:///c:/c_backup/projects/helix/src/components/AnalyticsChart.tsx): Lightweight SVG-based Top 5 Department savings bar chart.
- [InfraToggles.tsx](file:///c:/c_backup/projects/helix/src/components/InfraToggles.tsx): Panel C toggles to filter by AI/Cloud statuses.

---

## 🕵️ Jury Inspection Guide (Chrome DevTools / Inspect Tab)

Here is a step-by-step guide for the jury to inspect and verify the engineering constraints of Helix using browser Developer Tools.

### Test 1: Zero External Table/Virtualization Library Check
* **How to Verify**:
  1. Open Chrome DevTools (press `F12` or right-click ➔ **Inspect**).
  2. Go to the **Network** tab, reload the page, and filter by JS.
  3. Look through the loaded bundles or search your local [package.json](file:///c:/c_backup/projects/helix/package.json).
* **What to Look For**: Confirm there are no requests for or dependencies on `ag-grid`, `react-window`, `react-virtualized`, or `@tanstack/react-table`.
* **The Use**: Proves that all virtualization, DOM layout, and scroll recycling math are custom-written.

### Test 2: Fixed DOM Node Count & Element Recycling
* **How to Verify**:
  1. Go to the **Elements** tab.
  2. Drill down into the main grid wrapper: `#root` ➔ `main` ➔ `grid-container`.
  3. Notice the elements inside the viewport (scrollable area).
* **What to Look For**: 
  - There are exactly `(Viewport Height / 40px) + 2` div rows with the `grid-row` class.
  - Scroll the grid rapidly up and down. Notice that the actual number of DOM elements **does not grow**.
  - Watch the `style="transform: translateY(...px)"` values change dynamically in real-time as you scroll, and see the text content inside the child cells swap instantly.
* **The Use**: Verifies $O(1)$ memory complexity in the DOM. The browser only maintains ~15-20 rows in memory rather than 50,000, preventing page crashes.

### Test 3: GPU Hardware Acceleration (will-change)
* **How to Verify**:
  1. In the **Elements** tab, select any row `div.grid-row`.
  2. Look at the **Styles** pane on the right.
  3. Look for the `will-change` properties.
* **What to Look For**: Confirm `will-change: transform, background-color;` is defined. Alternatively:
  - Click the three dots menu at the top-right of DevTools ➔ **More tools** ➔ **Rendering**.
  - Check **Layer borders**.
  - You will see orange/olive borders surrounding the virtual rows. This indicates that the browser has composited them into their own hardware-accelerated rendering layers.
* **The Use**: Offloads translations and color fades to the GPU, avoiding CPU paint cycles and keeping scrolling lag-free.

### Test 4: Direct DOM Mutations (Zero React Re-renders)
* **How to Verify**:
  1. Install/open **React Developer Tools** (Profiler/Components tabs) or check console logs.
  2. Watch the counter metrics in the top KPI strip changing every 200ms.
* **What to Look For**: 
  - In React DevTools, select **Highlight updates when components render**. Notice that the KPI Cards and Grid do not highlight/blink on every 200ms stream tick.
  - Verify that the metrics in the top card strip are mutating via `.textContent` refs inside [KPIStrip.tsx](file:///c:/c_backup/projects/helix/src/components/KPIStrip.tsx) without triggering React's `render()` cycle.
* **The Use**: Prevents React from running expensive diffing algorithms on the virtual DOM 5 times a second, saving valuable CPU cycles.

### Test 5: Warning Alert Animation & Expiry
* **How to Verify**:
  1. Scroll down the grid until you see a row containing a **Failed** status or a negative **ROI** (anomalies injected by the firehose).
  2. Notice the warning red pulse animation flash.
  3. Select that row in the **Elements** tab immediately.
* **What to Look For**:
  - The class `row-alert` is added to the row element.
  - After 1.2 seconds, the `row-alert` class is automatically removed.
  - Verify in [VirtualGrid.tsx](file:///c:/c_backup/projects/helix/src/components/VirtualGrid.tsx) that a permanent `animationend` listener cleans up this class cleanly.
* **The Use**: Ensures that CSS animation classes do not accumulate or leak on recycled elements, and avoids layout reflows by animating `background-color` only.

### Test 6: Queue Buffering (Pause / Play)
* **How to Verify**:
  1. Click **Pause Stream** in the top control bar.
  2. Observe the badge showing `"Paused — N batches buffered"`.
  3. Open the **Console** tab. Notice that dataStream.js continues to log ticks in the background, but the UI grid is completely frozen.
  4. Wait a few seconds, then click **Resume Stream**.
* **What to Look For**: The buffered batches will immediately flush in order (FIFO sequence) and the table will smoothly resume updates.
* **The Use**: Verifies that no incoming metrics or data points are skipped while the operator is inspecting a frozen viewport.

---

## 📈 Local Development Commands

1. **Start Dev Server**:
   ```bash
   npm run dev
   ```
2. **Build Production Assets**:
   ```bash
   npm run build
   ```
3. **Preview Production Build**:
   ```bash
   npm run preview
   ```
