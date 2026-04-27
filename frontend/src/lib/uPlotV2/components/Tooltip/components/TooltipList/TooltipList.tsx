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
	const height = useMemo(
		() =>
			totalListHeight > 0
				? Math.ceil(Math.min(totalListHeight, LIST_MAX_HEIGHT))
				: Math.min(content.length * TOOLTIP_ITEM_HEIGHT, LIST_MAX_HEIGHT),
		[totalListHeight, content.length],
	);

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
					<TooltipItem item={item} isItemActive={false} />
				)}
			/>
		</div>
	);
}
