import type { HTMLAttributes, SyntheticEvent } from 'react';
import { useMemo } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';

import styles from './ResizableHeader.module.scss';

// react-resizable's user-select hack injects a global style that fights antd's
// own selection handling; disable it (V1 ResizeTable parity).
const DRAGGABLE_OPTS = { enableUserSelectHack: false };
// Don't let a column collapse past a usable width.
const MIN_WIDTH = 80;

export interface ResizableHeaderProps extends Omit<
	HTMLAttributes<HTMLTableCellElement>,
	'onResize'
> {
	width?: number;
	onResize?: (e: SyntheticEvent<Element>, data: ResizeCallbackData) => void;
}

/**
 * antd header cell (`components.header.cell`) that wraps the `<th>` in a
 * react-resizable handle. `width`/`onResize` are injected per column via the
 * column's `onHeaderCell` (see `useResizableColumns`); a column with neither
 * renders a plain, non-resizable header.
 */
function ResizableHeader({
	width,
	onResize,
	...restProps
}: ResizableHeaderProps): JSX.Element {
	const handle = useMemo(
		() => (
			<span
				className={styles.handle}
				role="presentation"
				// Stop the grip's click from reaching the column sorter underneath.
				// The grip is a pointer-only resize affordance, not keyboard-actionable.
				// oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
				onClick={(e): void => e.stopPropagation()}
			/>
		),
		[],
	);

	if (!width || !onResize) {
		return <th {...restProps} />;
	}

	return (
		<Resizable
			width={width}
			height={0}
			handle={handle}
			onResize={onResize}
			draggableOpts={DRAGGABLE_OPTS}
			minConstraints={[MIN_WIDTH, 0]}
		>
			<th {...restProps} className={styles.resizableHeader} />
		</Resizable>
	);
}

ResizableHeader.defaultProps = {
	width: undefined,
	onResize: undefined,
};

export default ResizableHeader;
