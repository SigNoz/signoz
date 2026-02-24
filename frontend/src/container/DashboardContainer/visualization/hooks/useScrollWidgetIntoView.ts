import { RefObject, useEffect } from 'react';
import { useDashboard } from 'providers/Dashboard/Dashboard';

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
	const { toScrollWidgetId, setToScrollWidgetId } = useDashboard();

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
