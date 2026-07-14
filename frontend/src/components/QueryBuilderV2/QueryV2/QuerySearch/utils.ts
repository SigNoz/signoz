import { closeCompletion, startCompletion } from '@codemirror/autocomplete';
import type { Completion } from '@codemirror/autocomplete';
import type { EditorView } from '@uiw/react-codemirror';
import dayjs from 'dayjs';
import { normalizeFilterExpression } from 'lib/recentQueries/normalize';
import * as recentQueriesStore from 'lib/recentQueries/recentQueriesStore';
import type { RecentQueryEntry } from 'lib/recentQueries/types';
import type { SignalType } from 'types/api/v5/queryRange';
import 'utils/timeUtils';

import {
	RECENT_COMPLETION_TYPE,
	RECENTS_DISPLAY_CAP,
	RECENTS_SECTION,
} from './constants';

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

// Filters and projects a list of recent-query entries into CodeMirror completions.
// Entries are supplied by the caller (typically via the useRecents hook) so this
// function stays pure and React doesn't have to re-subscribe inside CodeMirror's
// autocomplete callback.
export function getRecentOptions(
	entries: RecentQueryEntry[],
	fullDoc: string,
): Completion[] {
	const normalizedDoc = normalizeFilterExpression(fullDoc);

	const matches = entries
		.filter((e) => {
			const normalizedRecent = normalizeFilterExpression(e.filter.expression);
			if (normalizedRecent === normalizedDoc) {
				return false;
			}
			if (normalizedDoc === '') {
				return true;
			}
			return normalizedRecent.includes(normalizedDoc);
		})
		.slice(0, RECENTS_DISPLAY_CAP);

	return matches.map((entry, index) => ({
		label: entry.filter.expression,
		type: RECENT_COMPLETION_TYPE,
		// CodeMirror sorts within a section by boost desc, then label asc. The store
		// returns entries newest-first, so we mirror that by giving the newest entry
		// the highest boost — otherwise CM falls back to alphabetical order and the
		// "most recently used" expectation breaks. Stays within the recents section
		// because section.rank keeps recents above suggestions regardless of boost.
		boost: matches.length - index,
		section: RECENTS_SECTION,
		detail: dayjs(entry.lastUsedAt).fromNow(),
		recentId: entry.id,
		recentSignal: entry.signal,
		recentSource: entry.source,
		apply: (view: EditorView): void => {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: entry.filter.expression,
				},
				selection: { anchor: entry.filter.expression.length },
			});
			closeCompletion(view);
		},
	}));
}

export function renderRecentDeleteButton(
	completion: Completion,
	_state: unknown,
	view: EditorView | null,
): Node | null {
	if (completion.type !== RECENT_COMPLETION_TYPE) {
		return null;
	}

	const c = completion as Completion & {
		recentId?: string;
		recentSignal?: SignalType;
		recentSource?: string;
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
	// CodeMirror's autocomplete closes the popup on pointerdown / mousedown outside
	// the editor. The delete button lives inside the popup, so we must stop those
	// events early — otherwise clicking × would dismiss the dropdown before the
	// click handler fires and the entry wouldn't actually get removed.
	btn.addEventListener('pointerdown', stop);
	btn.addEventListener('mousedown', stop);
	btn.addEventListener('click', (e) => {
		stop(e);
		if (!c.recentId || !c.recentSignal) {
			return;
		}
		recentQueriesStore.remove(c.recentId, c.recentSignal, c.recentSource ?? '');
		if (view) {
			view.focus();
			startCompletion(view);
		}
	});

	return btn;
}
