import { useCallback, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { TooltipContentItem } from '../../../types';
import TooltipItem from '../TooltipItem/TooltipItem';
import logEvent from 'api/common/logEvent';
import { Events } from 'constants/events';

import Styles from './TooltipList.module.scss';

// Fallback per-item height before Virtuoso reports the real total.
const TOOLTIP_ITEM_HEIGHT = 38;
const LIST_MAX_HEIGHT = 300;
// Vertical padding (spacing-4 top + bottom) the SCSS applies to the scroll
// viewport. Virtuoso's reported height covers only the items, so it must be
// added back — otherwise the box is short by this amount, clipping the last
// row and showing a scrollbar even when every row would fit.
const LIST_VERTICAL_PADDING = 16;

interface TooltipListProps {
	id: string;
	content: TooltipContentItem[];
}

export default function TooltipList({
	id,
	content,
}: TooltipListProps): JSX.Element {
	const isDarkMode = useIsDarkMode();
	const isScrollEventTriggered = useRef(false);
	const [totalListHeight, setTotalListHeight] = useState(0);

	// Use the measured height from Virtuoso when available; fall back to a
	// per-item estimate on first render. Math.ceil prevents a 1 px
	// subpixel rounding gap from triggering a spurious scrollbar.
	const height = useMemo(() => {
		const contentHeight =
			totalListHeight > 0 ? totalListHeight : content.length * TOOLTIP_ITEM_HEIGHT;
		return Math.ceil(
			Math.min(contentHeight + LIST_VERTICAL_PADDING, LIST_MAX_HEIGHT),
		);
	}, [totalListHeight, content.length]);

	const handleScroll = useCallback(() => {
		if (!isScrollEventTriggered.current) {
			// TODO: remove event in July 2026
			logEvent(Events.TOOLTIP_CONTENT_SCROLLED, {
				id,
			});
			isScrollEventTriggered.current = true;
		}
	}, []);

	return (
		<div className={Styles.container}>
			<Virtuoso
				className={cx(Styles.list, !isDarkMode && Styles.listLightMode)}
				data-testid="uplot-tooltip-list"
				data={content}
				onScroll={handleScroll}
				style={{ height }}
				totalListHeightChanged={setTotalListHeight}
				itemContent={(_, item): JSX.Element => (
					<TooltipItem item={item} isItemActive={item.isHighlighted === true} />
				)}
			/>
		</div>
	);
}
