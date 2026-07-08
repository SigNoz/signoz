import { GripVertical } from '@signozhq/icons';
import { useCallback, useRef, useState } from 'react';

import './ResizableBox.styles.scss';

export type ResizableBoxHandle = 'top' | 'right' | 'bottom' | 'left';

export interface ResizableBoxProps {
	children: React.ReactNode;
	// Which edge the resize handle sits on. The edge determines the axis:
	// 'top'/'bottom' → vertical resize (height), 'left'/'right' → horizontal
	// resize (width). Dragging the handle away from the content grows the box;
	// dragging it toward the content shrinks it.
	handle?: ResizableBoxHandle;
	// Canonical default size, and the target that double-click reset restores to.
	defaultHeight?: number;
	minHeight?: number;
	maxHeight?: number;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
	// Starting size when different from the default (e.g. a persisted value).
	// Falls back to defaultWidth/defaultHeight when omitted, preserving the
	// behavior of callers that don't opt in.
	initialWidth?: number;
	initialHeight?: number;
	// When true, double-clicking the handle resets the size to
	// defaultWidth/defaultHeight and fires onResize with that value.
	resetToDefaultOnDoubleClick?: boolean;
	// When true, renders a visible grip indicator on the handle so it is
	// discoverable as a draggable affordance.
	withHandle?: boolean;
	onResize?: (size: number) => void;
	disabled?: boolean;
	className?: string;
	handleTestId?: string;
}

function ResizableBox({
	children,
	handle = 'bottom',
	defaultHeight = 200,
	minHeight = 50,
	maxHeight = Infinity,
	defaultWidth = 200,
	minWidth = 50,
	maxWidth = Infinity,
	initialWidth,
	initialHeight,
	resetToDefaultOnDoubleClick = false,
	withHandle = false,
	onResize,
	disabled = false,
	className,
	handleTestId,
}: ResizableBoxProps): JSX.Element {
	const isHorizontal = handle === 'left' || handle === 'right';
	const isStartHandle = handle === 'top' || handle === 'left';
	const [size, setSize] = useState(
		isHorizontal
			? (initialWidth ?? defaultWidth)
			: (initialHeight ?? defaultHeight),
	);
	const containerRef = useRef<HTMLDivElement>(null);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent): void => {
			e.preventDefault();
			const startPos = isHorizontal ? e.clientX : e.clientY;
			const startSize = size;
			const min = isHorizontal ? minWidth : minHeight;
			const max = isHorizontal ? maxWidth : maxHeight;
			// Start-edge handle: pointer moving away from content (negative delta)
			// grows the box, so invert the sign.
			const deltaSign = isStartHandle ? -1 : 1;

			const onMouseMove = (moveEvent: MouseEvent): void => {
				const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
				const delta = (currentPos - startPos) * deltaSign;
				const newSize = Math.min(max, Math.max(min, startSize + delta));
				setSize(newSize);
				onResize?.(newSize);
			};

			const onMouseUp = (): void => {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
				document.body.style.cursor = '';
				document.body.style.userSelect = '';
			};

			document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
			document.body.style.userSelect = 'none';
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		},
		[
			size,
			isHorizontal,
			isStartHandle,
			minWidth,
			maxWidth,
			minHeight,
			maxHeight,
			onResize,
		],
	);

	const handleDoubleClick = useCallback((): void => {
		if (!resetToDefaultOnDoubleClick) {
			return;
		}
		const nextSize = isHorizontal ? defaultWidth : defaultHeight;
		setSize(nextSize);
		onResize?.(nextSize);
	}, [
		resetToDefaultOnDoubleClick,
		isHorizontal,
		defaultWidth,
		defaultHeight,
		onResize,
	]);

	const containerStyle = disabled
		? undefined
		: isHorizontal
			? { width: size }
			: { height: size };
	const handleClass = `resizable-box__handle resizable-box__handle--${handle}`;

	return (
		<div
			ref={containerRef}
			className={`resizable-box ${disabled ? 'resizable-box--disabled' : ''} ${
				className || ''
			}`}
			style={containerStyle}
		>
			<div className="resizable-box__content">{children}</div>
			{!disabled && (
				<div
					role="separator"
					aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
					className={handleClass}
					onMouseDown={handleMouseDown}
					onDoubleClick={handleDoubleClick}
					data-testid={handleTestId}
				>
					{withHandle && (
						<span className="resizable-box__grip">
							<GripVertical size={12} />
						</span>
					)}
				</div>
			)}
		</div>
	);
}

export default ResizableBox;
