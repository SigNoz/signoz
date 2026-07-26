import { ConfigProvider, SelectProps } from 'antd';
// eslint-disable-next-line no-restricted-imports
import { useContext } from 'react';

export const popupContainer: SelectProps['getPopupContainer'] = (
	trigger,
): HTMLElement => trigger.parentNode;

/**
 * Popup container for query-builder Selects. Prefers a container supplied by an
 * ancestor antd `ConfigProvider` (set by hosts that render the builder inside a
 * clipped/portaled surface — e.g. the panel editor's `overflow:hidden` resizable
 * pane, or the View modal's focus-trapped dialog) and otherwise falls back to
 * `trigger.parentNode`, the app-wide default. No `ConfigProvider` container is set
 * app-wide, so surfaces that don't opt in keep the legacy behavior unchanged.
 */
export function useSelectPopupContainer(): SelectProps['getPopupContainer'] {
	const { getPopupContainer } = useContext(ConfigProvider.ConfigContext);
	return getPopupContainer ?? popupContainer;
}
