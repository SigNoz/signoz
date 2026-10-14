import { Minus, Plus, RotateCcw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import styles from './ZoomControls.module.scss';

interface ZoomControlsProps {
	canZoomIn: boolean;
	canZoomOut: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
}

// ButtonGroup only lays out horizontally, so the vertical stack is a plain column.
export default function ZoomControls({
	canZoomIn,
	canZoomOut,
	onZoomIn,
	onZoomOut,
	onReset,
}: ZoomControlsProps): JSX.Element {
	return (
		<div className={styles.controls} data-testid="geo-map-zoom-controls">
			<Button
				variant="solid"
				color="secondary"
				size="icon"
				aria-label="Zoom in"
				title="Zoom in"
				prefix={<Plus size={14} />}
				disabled={!canZoomIn}
				onClick={onZoomIn}
				data-testid="geo-map-zoom-in"
			/>
			<Button
				variant="solid"
				color="secondary"
				size="icon"
				aria-label="Zoom out"
				title="Zoom out"
				prefix={<Minus size={14} />}
				disabled={!canZoomOut}
				onClick={onZoomOut}
				data-testid="geo-map-zoom-out"
			/>
			<Button
				variant="solid"
				color="secondary"
				size="icon"
				aria-label="Reset view"
				title="Reset view"
				prefix={<RotateCcw size={14} />}
				disabled={!canZoomOut}
				onClick={onReset}
				data-testid="geo-map-zoom-reset"
			/>
		</div>
	);
}
