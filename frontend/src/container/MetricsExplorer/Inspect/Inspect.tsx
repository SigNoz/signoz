import './Inspect.styles.scss';

import * as Sentry from '@sentry/react';
import { Color } from '@signozhq/design-tokens';
import { Button, Drawer, Typography } from 'antd';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Compass } from 'lucide-react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import { InspectProps } from './types';

function Inspect({ metricName, isOpen, onClose }: InspectProps): JSX.Element {
	const isDarkMode = useIsDarkMode();

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Drawer
				width="100%"
				title={
					<div className="inspect-metrics-title">
						<Typography.Text>Metrics Explorer —</Typography.Text>
						<Button
							className="inspect-metric-button"
							size="small"
							icon={<Compass size={14} />}
							disabled
						>
							Inspect Metric
						</Button>
					</div>
				}
				open={isOpen}
				onClose={onClose}
				style={{
					overscrollBehavior: 'contain',
					background: isDarkMode ? Color.BG_INK_400 : Color.BG_VANILLA_100,
				}}
				className="inspect-metrics-modal"
				destroyOnClose
			>
				<div>Inspect</div>
				<div>{metricName}</div>
			</Drawer>
		</Sentry.ErrorBoundary>
	);
}

export default Inspect;
