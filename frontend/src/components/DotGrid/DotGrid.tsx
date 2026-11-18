import { useRef } from 'react';
import cx from 'classnames';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { useDotGrid } from './useDotGrid';

import styles from './DotGrid.module.scss';

interface DotGridProps {
	/** Sizes and places the grid; it fills whatever box it gets. */
	className?: string;
	/** Called when a Snake game starts or ends. */
	onGameChange?: (isPlaying: boolean) => void;
}

/** Aurora dot grid that drifts on its own and lights up under the cursor. */
export default function DotGrid({
	className,
	onGameChange,
}: DotGridProps): JSX.Element {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDarkMode = useIsDarkMode();
	const label = useDotGrid(canvasRef, isDarkMode, onGameChange);

	return (
		<div
			className={cx(styles.dotGrid, className)}
			data-testid="ai-dot-grid"
			aria-hidden
		>
			<canvas ref={canvasRef} className={styles.canvas} />
			{label && <span className={styles.label}>{label}</span>}
		</div>
	);
}
