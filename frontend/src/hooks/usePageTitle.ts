import { useEffect, useRef } from 'react';
import { create } from 'zustand';

interface TitleEntry {
	id: number;
	title: string;
}

const usePageTitleStore = create<{ entries: TitleEntry[] }>(() => ({
	entries: [],
}));

usePageTitleStore.subscribe(({ entries }) => {
	if (entries.length > 0) {
		// Most specific segment first: 'pod-name | Pods | Infra Monitoring | SigNoz'
		document.title = entries
			.map((entry) => entry.title)
			.reverse()
			.join(' | ');
	}
});

let nextId = 0;

/**
 * Stacks a segment onto the document title for as long as the calling
 * component is mounted. Mount order builds the hierarchy (root first),
 * and the rendered title reads most specific first:
 *
 *   root:        usePageTitle('SigNoz')
 *   page:        usePageTitle('Dashboards')
 *   detail view: usePageTitle(dashboardName)
 *   => '<dashboardName> | Dashboards | SigNoz'
 *
 * Pass `undefined` to contribute nothing (e.g. while data is loading);
 * the segment appears once a value is provided and is removed on unmount.
 */
export function usePageTitle(title?: string): void {
	const idRef = useRef<number>();
	if (idRef.current === undefined) {
		nextId += 1;
		idRef.current = nextId;
	}
	const id = idRef.current;

	useEffect(() => {
		if (!title) {
			return undefined;
		}
		usePageTitleStore.setState(({ entries }) => {
			const index = entries.findIndex((entry) => entry.id === id);
			if (index >= 0) {
				// Update in place so the segment keeps its position in the stack
				const next = [...entries];
				next[index] = { id, title };
				return { entries: next };
			}
			return { entries: [...entries, { id, title }] };
		});
		return (): void => {
			usePageTitleStore.setState(({ entries }) => ({
				entries: entries.filter((entry) => entry.id !== id),
			}));
		};
	}, [id, title]);
}
