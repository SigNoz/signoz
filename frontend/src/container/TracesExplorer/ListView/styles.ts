import { CSSProperties } from 'react';
import styled from 'styled-components';

// Kept for legacy antd consumers (TracesTableComponent, LogsPanelComponent).
// The TanStack ListView doesn't use it.
export const tableStyles: CSSProperties = {
	cursor: 'unset',
};

export const Container = styled.div`
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	// Fallback: the page-level CSS chain (.trace-explorer-page → .trace-explorer →
	// .traces-explorer-views) isn't a flex column today, so flex:1 alone has nothing
	// to flex against. Anchor a height via the viewport so react-virtuoso (inside
	// TanStackTable) has a sized parent to render into.
	height: calc(100vh - 240px);
	min-height: 400px;

	// Match logs explorer table typography (mirrors LogsExplorerList.style.scss).
	font-family: 'Space Mono', monospace;

	// Row hover affordance — TanStack's row hover reads var(--row-hover-bg) with no
	// fallback, so without setting it hover is invisible.
	--row-hover-bg: var(--l1-border);

	// Small leading gap before the pinned timestamp column. No drag handle here
	// (pinned columns aren't movable), so we don't need the full 12px we use in
	// the grouped Traces view — 5px just keeps the text off the table edge.
	--tanstack-cell-padding-left-first-column: 5px;

	// Allow dynamic-field cells to clamp to 3 lines (matches old LineClampedText
	// behavior). Header + intrinsic columns stay 1-line by their own settings.
	--tanstack-plain-body-line-clamp: 3;

	--typography-color: var(--l1-foreground);
`;
