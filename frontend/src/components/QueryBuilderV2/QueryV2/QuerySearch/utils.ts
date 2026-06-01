import { startCompletion } from '@codemirror/autocomplete';
import type { Completion } from '@codemirror/autocomplete';
import type { EditorView } from '@uiw/react-codemirror';
import dayjs from 'dayjs';
import { normalizeFilterExpression } from 'lib/recentQueries/normalize';
import * as recentQueriesStore from 'lib/recentQueries/store';
import 'utils/timeUtils';

import { RECENTS_DISPLAY_CAP, RECENTS_SECTION } from './constants';

export type RecentsSignal = 'logs' | 'traces' | 'metrics';

export function combineInitialAndUserExpression(
	initial: string,
	user: string,
): string {
	const i = initial.trim();
	const u = user.trim();
	if (!i) {
		return u;
	}
	if (!u) {
		return i;
	}
	return `${i} AND (${u})`;
}

export function getUserExpressionFromCombined(
	initial: string,
	combined: string | null | undefined,
): string {
	const i = initial.trim();
	const c = (combined ?? '').trim();
	if (!c) {
		return '';
	}
	if (!i) {
		return c;
	}
	if (c === i) {
		return '';
	}
	const wrappedPrefix = `${i} AND (`;
	if (c.startsWith(wrappedPrefix) && c.endsWith(')')) {
		return c.slice(wrappedPrefix.length, -1);
	}
	const plainPrefix = `${i} AND `;
	if (c.startsWith(plainPrefix)) {
		return c.slice(plainPrefix.length);
	}
	return c;
}

export function getRecentOptions(
	signal: RecentsSignal,
	fullDoc: string,
): Completion[] {
	const all = recentQueriesStore.list(signal);
	const normalizedDoc = normalizeFilterExpression(fullDoc);

	const matches = all
		.filter((e) => {
			if (normalizedDoc === '') {
				return true;
			}
			return normalizeFilterExpression(e.filter.expression).includes(
				normalizedDoc,
			);
		})
		.slice(0, RECENTS_DISPLAY_CAP);

	return matches.map((entry) => ({
		label: entry.filter.expression,
		type: 'recent' as const,
		boost: -50,
		section: RECENTS_SECTION,
		detail: dayjs(entry.lastUsedAt).fromNow(),
		recentId: entry.id,
		recentSignal: entry.signal,
		apply: (view: EditorView): void => {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: entry.filter.expression,
				},
				selection: { anchor: entry.filter.expression.length },
			});
		},
	}));
}

export function renderRecentDeleteButton(
	completion: Completion,
	_state: unknown,
	view: EditorView | null,
): Node {
	if (completion.type !== 'recent') {
		const empty = document.createElement('span');
		empty.style.display = 'none';
		return empty;
	}

	const c = completion as Completion & {
		recentId?: string;
		recentSignal?: RecentsSignal;
	};

	const btn = document.createElement('button');
	btn.type = 'button';
	btn.className = 'cm-recent-delete';
	btn.setAttribute('aria-label', 'Remove from recent searches');
	btn.title = 'Remove from recent searches';
	btn.textContent = '×';
	queueMicrotask(() => {
		if (btn.parentElement) {
			btn.parentElement.title = completion.label;
		}
	});

	const stop = (e: Event): void => {
		e.preventDefault();
		e.stopPropagation();
	};
	btn.addEventListener('pointerdown', stop);
	btn.addEventListener('mousedown', stop);
	btn.addEventListener('click', (e) => {
		stop(e);
		if (!c.recentId || !c.recentSignal) {
			return;
		}
		recentQueriesStore.remove(c.recentId, c.recentSignal);
		if (view) {
			view.focus();
			startCompletion(view);
		}
	});

	return btn;
}
