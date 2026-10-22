import type { DrawerWrapperProps } from '@signozhq/ui/drawer';
import { noop } from 'lodash-es';

/**
 * `DrawerWrapper`'s motion@11 runs its slide on WAAPI and paints one stale frame
 * when it finishes; an `onUpdate` (untyped, forwarded to motion) keeps it JS-driven.
 */
export const JS_DRIVEN_SLIDE = {
	onUpdate: noop,
} as DrawerWrapperProps['drawerContentProps'];
