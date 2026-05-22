import { useCallback, useRef, useState } from 'react';

import './ResizableBox.styles.scss';

export interface ResizableBoxProps {
	children: React.ReactNode;
	direction?: 'vertical' | 'horizontal';
	// Which edge the resize handle sits on. 'end' = bottom (vertical) or right
	// (horizontal); 'start' = top or left. Dragging the start handle towards the
	// content shrinks it; away grows it.
	handlePosition?: 'start' | 'end';
	defaultHeight?: number;
	minHeight?: number;
	maxHeight?: number;
	defaultWidth?: number;
	minWidth?: number;
	maxWidth?: number;
	onResize?: (size: number) => void;
	disabled?: boolean;
	className?: string;
}

function ResizableBox({
	children,
	direction = 'vertical',
	handlePosition = 'end',
	defaultHeight = 200,
	minHeight = 50,
	maxHeight = Infinity,
	defaultWidth = 200,
	minWidth = 50,
	maxWidth = Infinity,
	onResize,
	disabled = false,
	className,
}: ResizableBoxProps): JSX.Element {
	const isHorizontal = direction === 'horizontal';
	const isStartHandle = handlePosition === 'start';
	const [size, setSize] = useState(isHorizontal ? defaultWidth : defaultHeight);
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

	const containerStyle = disabled
		? undefined
		: isHorizontal
			? { width: size }
			: { height: size };
	const handleClass = [
		'resizable-box__handle',
		`resizable-box__handle--${direction}`,
		`resizable-box__handle--${direction}-${handlePosition}`,
	].join(' ');

	return (
		<div
			ref={containerRef}
			className={`resizable-box ${disabled ? 'resizable-box--disabled' : ''} ${
				className || ''
			}`}
			style={containerStyle}
		>
			<div className="resizable-box__content">{children}</div>
			{!disabled && <div className={handleClass} onMouseDown={handleMouseDown} />}
		</div>
	);
}

export default ResizableBox;
