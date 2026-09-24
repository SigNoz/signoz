import { RefObject, useEffect } from 'react';
import { useScrollToWidgetIdStore } from 'providers/Dashboard/helpers/scrollToWidgetIdHelper';

/**
 * Scrolls the given widget container into view when the dashboard
 * requests it via `toScrollWidgetId`.
 *
 * Intended for use in panel components that render a single widget.
 */
export function useScrollWidgetIntoView<T extends HTMLElement>(
	widgetId: string,
	widgetContainerRef: RefObject<T>,
): void {
	const toScrollWidgetId = useScrollToWidgetIdStore((s) => s.toScrollWidgetId);
	const setToScrollWidgetId = useScrollToWidgetIdStore(
		(s) => s.setToScrollWidgetId,
	);

	useEffect(() => {
		if (toScrollWidgetId === widgetId) {
			widgetContainerRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
			widgetContainerRef.current?.focus();
			setToScrollWidgetId('');
		}
	}, [toScrollWidgetId, setToScrollWidgetId, widgetId, widgetContainerRef]);
}
