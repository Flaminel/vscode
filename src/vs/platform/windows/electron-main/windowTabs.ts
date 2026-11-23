/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../base/common/event.js';
import { ICodeWindow } from '../../window/electron-main/window.js';

export class WindowTabs {

	private readonly _onDidChange = new Emitter<void>();
	readonly onDidChange = this._onDidChange.event;

	private readonly groups: ICodeWindow[][] = [];
	private readonly tracked = new WeakSet<ICodeWindow>();

	getTabs(window: ICodeWindow): readonly ICodeWindow[] {
		return this.findGroup(window) ?? [window];
	}

	addTab(anchor: ICodeWindow, window: ICodeWindow): void {
		let group = this.findGroup(anchor);
		if (!group) {
			group = [anchor];
			this.groups.push(group);
		}

		group.push(window);
		this.track(anchor);
		this.track(window);
		this._onDidChange.fire();

		this.matchBounds(anchor, window);

		Event.once(window.onDidSignalReady)(() => this.activate(window));
	}

	activate(window: ICodeWindow): void {
		const group = this.findGroup(window);
		if (!group || !window.win) {
			return;
		}

		const previous = group.find(tab => tab !== window && tab.win?.isVisible());
		if (previous) {
			this.matchBounds(previous, window);
		}

		window.win.show();
		window.focus();

		for (const tab of group) {
			if (tab !== window) {
				tab.win?.hide();
			}
		}

		this._onDidChange.fire();
	}

	move(window: ICodeWindow, index: number): void {
		const group = this.findGroup(window);
		if (!group) {
			return;
		}

		group.splice(group.indexOf(window), 1);
		group.splice(Math.max(0, Math.min(index, group.length)), 0, window);
		this._onDidChange.fire();
	}

	remove(window: ICodeWindow): void {
		const group = this.findGroup(window);
		if (!group) {
			return;
		}

		const index = group.indexOf(window);
		const wasVisible = !!window.win?.isVisible();
		group.splice(index, 1);

		if (group.length <= 1) {
			this.groups.splice(this.groups.indexOf(group), 1);
		}

		this._onDidChange.fire();

		const next = group[Math.min(index, group.length - 1)];
		if (wasVisible && next) {
			this.activate(next);
		}
	}

	private track(window: ICodeWindow): void {
		if (!window.win || this.tracked.has(window)) {
			return;
		}

		this.tracked.add(window);
		window.win.on('page-title-updated', () => this._onDidChange.fire());
	}

	private findGroup(window: ICodeWindow): ICodeWindow[] | undefined {
		return this.groups.find(group => group.includes(window));
	}

	private matchBounds(source: ICodeWindow, target: ICodeWindow): void {
		if (!source.win || !target.win) {
			return;
		}

		if (source.win.isMaximized()) {
			target.win.maximize();
		} else {
			target.win.setBounds(source.getBounds());
		}
	}
}
