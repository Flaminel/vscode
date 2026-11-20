# Native window tabs for Windows 11

## Goal

Show a tab strip above the editor tabs. Each tab is one VS Code window (one project).
Alt+tab shows one VS Code entry only.
The feature targets Windows 11.

## Background

Today one VS Code window is one Electron `BrowserWindow` with one renderer.
The window code is in `src/vs/platform/windows/electron-main/`.
The files are `windowImpl.ts` and `windowsMainService.ts`.
The renderer draws the title bar in `src/vs/workbench/browser/parts/titlebar/titlebarPart.ts`.

macOS tabs use the OS feature `tabbingIdentifier`.
Windows has no equivalent in Electron.
The feature must be built in VS Code.

## Option A: host views in one shell window

### Design

1. One top-level `BrowserWindow` per tab group.
2. Each project workbench runs in its own `WebContentsView`.
3. A small tab-strip view sits at the top of the shell window.
4. A tab click makes the main process show one workbench view and hide the others.

### Alt+tab result

One entry per shell window. The result is correct by construction.

### Cost

High.
Much code assumes that a `CodeWindow` owns a `BrowserWindow`.
This includes window ids, focus, fullscreen, zoom, title bar overlay, DevTools, menus, and the native handle.
Merges from upstream are difficult.

### Choose A when

1. Option B shows flicker or sync problems that users cannot accept.
2. You need one window frame to own several workbenches (for example, a shared native title bar).

## Option B: separate windows with shared bounds

### Design

1. Each project keeps its own `BrowserWindow`.
2. Windows in one tab group share one bounds rectangle.
3. The active tab window is visible. Inactive tab windows are hidden with `hide()`.
4. The main process holds the tab state: groups, order, and the active tab.
5. Each workbench renders the tab strip above the existing title bar.
6. A move or resize of the active window updates the bounds of the hidden windows.

### Alt+tab result

Hidden windows do not appear in alt+tab or on the taskbar.
Only the active tab window is visible.
The result is one entry.

### Risks

1. On a tab switch, show the new window first, then hide the old window. This prevents a flash of the desktop.
2. Hidden renderers get background throttling. A long task in a hidden window can run slowly.
3. Windows 11 snap layouts and snap groups act on the visible window only.
4. Drag to detach and drag to reorder need custom code.

### Cost

Moderate. This is the first implementation.

## Decision

Build option B first.
Keep this document if you return to option A.
