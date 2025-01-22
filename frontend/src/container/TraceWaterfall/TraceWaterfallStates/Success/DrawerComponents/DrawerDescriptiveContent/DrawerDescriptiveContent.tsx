import './DrawerDescriptiveContent.styles.scss';

import { Typography } from 'antd';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { CalendarClock, Timer } from 'lucide-react';
import { useMemo } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

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

	const statusCodeClassName = useMemo(() => {
		if (span.statusCodeString === 'unset') {
			return '';
		}
		const statusCode = parseFloat(span.statusCodeString);
		if (statusCode >= 200 && statusCode < 300) {
			return 'success';
		}
		if (statusCode >= 400) {
			return 'error';
		}

		return '';
	}, [span.statusCodeString]);

	return (
		<div className="trace-drawer-descriptive-content">
			<section className="span-name-duration">
				<section className="span-name">
					<section className="info-pill">
						<Typography.Text className="text">Span name</Typography.Text>
						<Typography.Text className="value">{span.name}</Typography.Text>
					</section>
					<section className="info-pill">
						<Typography.Text className="text">Status code</Typography.Text>
						<Typography.Text className={cx('value', statusCodeClassName)}>
							{span.statusCodeString}
						</Typography.Text>
					</section>
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
							{formatEpochTimestamp(span.timestamp)}
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
				<div className="item">
					<Typography.Text className="text">Span kind</Typography.Text>
					<Typography.Text className="value">{span.spanKind}</Typography.Text>
				</div>
			</section>
		</div>
	);
}

export default DrawerDescriptiveContent;
