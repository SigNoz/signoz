import { ComponentProps, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Rnd } from 'react-rnd';

import './FloatingPanel.styles.scss';
import type { Obstacle } from 'lib/obstacles/types';
import { useAvoidObstacles } from './useAvoidObstacles';
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
	/** Slides the panel clear of these while they show; keep the array stable across renders. */
	avoid?: Obstacle[];
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
	avoid,
}: FloatingPanelProps): JSX.Element | null {
	const rndRef = useRef<Rnd>(null);
	const viewport = useKeepInViewport(rndRef, isOpen && keepInViewport);
	useAvoidObstacles(rndRef, avoid, isOpen);

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
			bounds="window"
			minWidth={keepInViewport ? Math.min(minWidth, viewport.width) : minWidth}
			minHeight={keepInViewport ? Math.min(minHeight, viewport.height) : minHeight}
			className={`floating-panel ${className || ''}`}
			enableResizing={enableResizing}
		>
			<div className="floating-panel__inner">{children}</div>
		</Rnd>,
		document.body,
	);
}

export default FloatingPanel;
