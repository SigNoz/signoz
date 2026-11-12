import { ComponentProps, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';

import './FloatingPanel.styles.scss';
import { useKeepInViewport } from './useKeepInViewport';

type EnableResizing = ComponentProps<typeof Rnd>['enableResizing'];

export interface FloatingPanelProps {
	isOpen: boolean;
	children: React.ReactNode;
	defaultPosition?: { x: number; y: number };
	width?: number;
	height?: number;
	minWidth?: number;
	minHeight?: number;
	enableResizing?: EnableResizing;
	className?: string;
	/** Moves and shrinks the panel back into view when the window resizes. */
	keepInViewport?: boolean;
}

function FloatingPanel({
	isOpen,
	children,
	defaultPosition,
	width = 560,
	height = 600,
	minWidth = 400,
	minHeight = 300,
	enableResizing,
	className,
	keepInViewport = false,
}: FloatingPanelProps): JSX.Element | null {
	const rndRef = useRef<Rnd>(null);
	const viewport = useKeepInViewport(rndRef, isOpen && keepInViewport);

	if (!isOpen) {
		return null;
	}

	const initialPosition = defaultPosition || {
		x: window.innerWidth - width - 24,
		y: 80,
	};

	return createPortal(
		<Rnd
			ref={rndRef}
			default={{
				x: initialPosition.x,
				y: initialPosition.y,
				width,
				height,
			}}
			dragHandleClassName="floating-panel__drag-handle"
			minWidth={keepInViewport ? Math.min(minWidth, viewport.width) : minWidth}
			minHeight={keepInViewport ? Math.min(minHeight, viewport.height) : minHeight}
			onDrag={(_e, d): void | false => {
				const HEADER_HEIGHT = 40;
				// Top: don't allow header to go above viewport
				if (d.y < 0) {
					return false;
				}
				// Left: don't allow panel to go off-screen left
				if (d.x < 0) {
					return false;
				}
				// Bottom: only header needs to be visible
				if (d.y > window.innerHeight - HEADER_HEIGHT) {
					return false;
				}
				// Right: at least the close button (~40px) stays visible
				if (d.x > window.innerWidth - 40) {
					return false;
				}
			}}
			className={`floating-panel ${className || ''}`}
			enableResizing={enableResizing}
		>
			<div className="floating-panel__inner">{children}</div>
		</Rnd>,
		document.body,
	);
}

export default FloatingPanel;
