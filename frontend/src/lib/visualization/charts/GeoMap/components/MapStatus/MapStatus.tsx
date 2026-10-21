import { Button } from '@signozhq/ui/button';

import styles from './MapStatus.module.scss';

interface MapStatusProps {
	status: 'loading' | 'failed';
	onRetry: () => void;
}

/** Stands in for the map while a country's states load, or after they failed to. */
export default function MapStatus({
	status,
	onRetry,
}: MapStatusProps): JSX.Element {
	return (
		<div className={styles.status} data-testid={`geo-map-${status}`}>
			<span className="translate-safe">
				{status === 'loading' ? 'Loading map…' : 'Couldn’t load the map'}
			</span>
			{status === 'failed' && (
				<Button
					variant="outlined"
					color="secondary"
					size="sm"
					onClick={onRetry}
					testId="geo-map-retry"
				>
					Retry
				</Button>
			)}
		</div>
	);
}
