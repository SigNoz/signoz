import { Typography } from 'antd';
import { generatePath } from 'react-router-dom';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import ROUTES from 'constants/routes';

export const topTracesTableColumns = [
	{
		title: 'TRACE ID',
		dataIndex: 'trace_id',
		key: 'trace_id',
		render: (traceId: string): JSX.Element => {
			const traceDetailPath = generatePath(ROUTES.TRACE_DETAIL, {
				id: traceId,
			});

			const handleClick = (): void => {
				window.open(traceDetailPath, '_blank');
			};

			return (
				<Typography.Link
					onClick={handleClick}
					className="trace-id-cell"
				>
					{traceId}
				</Typography.Link>
			);
		},
	},
	{
		title: 'STEP TRANSITION DURATION',
		dataIndex: 'duration_ms',
		key: 'duration_ms',
		render: (value: string): string => getYAxisFormattedValue(`${value}`, 'ms'),
	},
];
