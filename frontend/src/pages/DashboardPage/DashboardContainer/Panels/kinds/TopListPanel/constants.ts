import { Color } from '@signozhq/design-tokens';

/** Groups shown when the query sets no limit. */
export const DEFAULT_LIMIT = 10;
/** Row heights by density, roomiest first: comfortable, default, compact. */
export const ROW_HEIGHTS = [32, 28, 24] as const;
export const DEFAULT_ROW_HEIGHT = 28;
export const ROW_GAP = 1;
/** The list's top and bottom padding combined. */
export const LIST_PADDING_Y = 12;
/** The sticky column header row. */
export const HEADER_HEIGHT = 24;
/** Matches the server's default for an unset `appearance.barColor`. */
export const DEFAULT_BAR_COLOR = Color.BG_ROBIN_500;
