import { useMemo } from 'react';
import cx from 'classnames';
import {
	DashboardtypesTextAlignDTO,
	DashboardtypesVerticalAlignDTO,
} from 'api/generated/services/sigNoz.schemas';
import { selectResolvedVariables } from 'pages/DashboardPage/DashboardContainer/store/slices/variableSelectionSlice';
import { useDashboardStore } from 'pages/DashboardPage/DashboardContainer/store/useDashboardStore';

import type { StaticRendererProps } from '../../types/rendererProps';
import { interpolateVariables } from './interpolateVariables';
import MarkdownContent from './MarkdownContent';
import ScrollToBottomPill from './ScrollToBottomPill';
import { useOverflowBelow } from './useOverflowBelow';

import styles from './Renderer.module.scss';

const HORIZONTAL_ALIGN_CLASS: Record<DashboardtypesTextAlignDTO, string> = {
	[DashboardtypesTextAlignDTO.left]: styles.alignLeft,
	[DashboardtypesTextAlignDTO.center]: styles.alignCenter,
	[DashboardtypesTextAlignDTO.right]: styles.alignRight,
};

const VERTICAL_ALIGN_CLASS: Record<DashboardtypesVerticalAlignDTO, string> = {
	[DashboardtypesVerticalAlignDTO.top]: styles.alignTop,
	[DashboardtypesVerticalAlignDTO.center]: styles.alignMiddle,
	[DashboardtypesVerticalAlignDTO.bottom]: styles.alignBottom,
};

/**
 * Renders the panel's own Markdown body. The first kind that issues no query, so it
 * reads nothing from `data` and has no loading or error state — malformed Markdown
 * renders as literal text rather than throwing.
 */
function Renderer({
	panel,
	dashboardId,
}: StaticRendererProps<'signoz/TextPanel'>): JSX.Element {
	const { text, presentation } = panel.spec.plugin.spec;

	const variables = useDashboardStore(
		selectResolvedVariables(dashboardId ?? ''),
	);

	// Interpolate and parse together: a dashboard re-renders on every variable tick,
	// and re-parsing every text panel on each one is the cost worth avoiding.
	const body = useMemo(
		() => interpolateVariables(text ?? '', variables),
		[text, variables],
	);

	const { scrollRef, hasMoreBelow, scrollToBottom } =
		useOverflowBelow<HTMLDivElement>();

	return (
		<div className={styles.host}>
			<div
				ref={scrollRef}
				className={cx(
					styles.panel,
					HORIZONTAL_ALIGN_CLASS[
						presentation?.textAlign ?? DashboardtypesTextAlignDTO.left
					],
					VERTICAL_ALIGN_CLASS[
						presentation?.verticalAlign ?? DashboardtypesVerticalAlignDTO.top
					],
				)}
				data-testid="text-panel"
			>
				<MarkdownContent>{body}</MarkdownContent>
			</div>
			{hasMoreBelow && <ScrollToBottomPill onClick={scrollToBottom} />}
		</div>
	);
}

export default Renderer;
