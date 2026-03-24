import { Typography } from 'antd';

import { TimeSeriesLabelProps } from './types';

function TimeSeriesLabel({
	timeSeries,
	textColor,
}: TimeSeriesLabelProps): JSX.Element {
	return (
		<>
			{Object.entries(timeSeries?.labels ?? {}).map(([key, value]) => (
				<span key={key}>
					<Typography.Text style={{ color: textColor, fontWeight: 600 }}>
						{key}
					</Typography.Text>
					: {value}{' '}
				</span>
			))}
		</>
	);
}

export default TimeSeriesLabel;
