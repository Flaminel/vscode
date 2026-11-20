/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../base/common/event.js';
import { ICodeWindow } from '../../window/electron-main/window.js';

export class WindowTabs {

	private readonly groups: ICodeWindow[][] = [];

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

		const next = group[Math.min(index, group.length - 1)];
		if (wasVisible && next) {
			this.activate(next);
		}
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
