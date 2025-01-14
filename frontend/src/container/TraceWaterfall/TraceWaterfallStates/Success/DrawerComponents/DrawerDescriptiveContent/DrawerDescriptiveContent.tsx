import './DrawerDescriptiveContent.styles.scss';

import { Typography } from 'antd';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { CalendarClock, Timer } from 'lucide-react';
import { Span } from 'types/api/trace/getTraceV2';
import { getFormattedDateWithMinutesAndSeconds } from 'utils/timeUtils';

interface IDrawerDescriptiveContentProps {
	span: Span;
}

function DrawerDescriptiveContent(
	props: IDrawerDescriptiveContentProps,
): JSX.Element {
	const { span } = props;
	const isDarkMode = useIsDarkMode();

	const color = generateColor(
		span.serviceName,
		isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
	);

	return (
		<div className="trace-drawer-descriptive-content">
			<section className="span-name-duration">
				<section className="span-name">
					<Typography.Text className="text">Span name</Typography.Text>
					<Typography.Text className="value">{span.name}</Typography.Text>
				</section>
				<section className="span-duration">
					<Typography.Text className="item">
						<Timer size={14} />
						<Typography.Text className="value">
							{getYAxisFormattedValue(`${span.durationNano}`, 'ns')}
						</Typography.Text>
					</Typography.Text>
					<Typography.Text className="item">
						<CalendarClock size={14} />
						<Typography.Text className="value">
							{getFormattedDateWithMinutesAndSeconds(span.timestamp / 1e3)}
						</Typography.Text>
					</Typography.Text>
				</section>
			</section>
			<section className="span-metadata">
				<div className="item">
					<Typography.Text className="text">Span ID</Typography.Text>
					<Typography.Text className="value">{span.spanId}</Typography.Text>
				</div>
				<div className="item">
					<Typography.Text className="text">Service</Typography.Text>
					<Typography.Text className="value">
						<div className="dot" style={{ backgroundColor: color }} />
						{span.serviceName}
					</Typography.Text>
				</div>
			</section>
		</div>
	);
}

export default DrawerDescriptiveContent;
