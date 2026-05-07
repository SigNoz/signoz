export const ROW_HEIGHT = 24;
export const SPAN_BAR_HEIGHT = 22;
export const SPAN_BAR_Y_OFFSET = Math.floor((ROW_HEIGHT - SPAN_BAR_HEIGHT) / 2);
export const EVENT_DOT_SIZE = 6;

// Span bar sizing relative to row height (used by getFlamegraphRowMetrics)
export const SPAN_BAR_HEIGHT_RATIO = SPAN_BAR_HEIGHT / ROW_HEIGHT;
export const MIN_SPAN_BAR_HEIGHT = 8;
export const MAX_SPAN_BAR_HEIGHT = SPAN_BAR_HEIGHT;

// Event dot sizing relative to span bar height
export const EVENT_DOT_SIZE_RATIO = EVENT_DOT_SIZE / SPAN_BAR_HEIGHT;
export const MIN_EVENT_DOT_SIZE = 4;
export const MAX_EVENT_DOT_SIZE = EVENT_DOT_SIZE;

export const LABEL_FONT = '11px Inter, sans-serif';
export const LABEL_PADDING_X = 8;
export const MIN_WIDTH_FOR_NAME = 30;
export const MIN_WIDTH_FOR_NAME_AND_DURATION = 80;

// Dynamic row height (vertical zoom) -- disabled for now (MIN === MAX)
export const MIN_ROW_HEIGHT = 24;
export const MAX_ROW_HEIGHT = 24;
export const DEFAULT_ROW_HEIGHT = MIN_ROW_HEIGHT;

// Zoom intensity -- how fast zoom reacts to wheel/pinch delta
export const PINCH_ZOOM_INTENSITY_H = 0.01;
export const SCROLL_ZOOM_INTENSITY_H = 0.0015;
export const PINCH_ZOOM_INTENSITY_V = 0.008;
export const SCROLL_ZOOM_INTENSITY_V = 0.001;

// Minimum visible time span in ms (prevents zooming to sub-pixel)
export const MIN_VISIBLE_SPAN_MS = 5;

// Selected span style (dashed border)
export const DASHED_BORDER_LINE_DASH = [4, 2];
