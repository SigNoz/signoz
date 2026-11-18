import { Minus, Plus, RotateCcw } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';

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
			<Tooltip title="Zoom in" side="left">
				<Button
					icon
					variant="solid"
					color="secondary"
					size="sm"
					aria-label="Zoom in"
					disabled={!canZoomIn}
					disabledTooltip="Already zoomed in all the way"
					onClick={onZoomIn}
					testId="geo-map-zoom-in"
				>
					<Plus size={14} />
				</Button>
			</Tooltip>
			<Tooltip title="Zoom out" side="left">
				<Button
					icon
					variant="solid"
					color="secondary"
					size="sm"
					aria-label="Zoom out"
					disabled={!canZoomOut}
					disabledTooltip="Already showing the whole view"
					onClick={onZoomOut}
					testId="geo-map-zoom-out"
				>
					<Minus size={14} />
				</Button>
			</Tooltip>
			<Tooltip title="Reset view" side="left">
				<Button
					icon
					variant="solid"
					color="secondary"
					size="sm"
					aria-label="Reset view"
					disabled={!canZoomOut}
					disabledTooltip="Already at the starting view"
					onClick={onReset}
					testId="geo-map-zoom-reset"
				>
					<RotateCcw size={14} />
				</Button>
			</Tooltip>
		</div>
	);
}
