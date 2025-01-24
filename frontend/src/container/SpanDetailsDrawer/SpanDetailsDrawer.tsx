import './SpanDetailsDrawer.styles.scss';

import { Button, Tabs, TabsProps, Typography } from 'antd';
import cx from 'classnames';
import { getYAxisFormattedValue } from 'components/Graph/yAxisConfig';
import { themeColors } from 'constants/theme';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { generateColor } from 'lib/uPlotLib/utils/generateColor';
import { Anvil, Bookmark, PanelRight, Search } from 'lucide-react';
import { Dispatch, SetStateAction, useState } from 'react';
import { Span } from 'types/api/trace/getTraceV2';
import { formatEpochTimestamp } from 'utils/timeUtils';

import Attributes from './Attributes/Attributes';
import Events from './Events/Events';

interface ISpanDetailsDrawerProps {
	isSpanDetailsDocked: boolean;
	setIsSpanDetailsDocked: Dispatch<SetStateAction<boolean>>;
	selectedSpan: Span | undefined;
	traceStartTime: number;
}

function SpanDetailsDrawer(props: ISpanDetailsDrawerProps): JSX.Element {
	const {
		isSpanDetailsDocked,
		setIsSpanDetailsDocked,
		selectedSpan,
		traceStartTime,
	} = props;

	const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);
	const isDarkMode = useIsDarkMode();
	const color = generateColor(
		selectedSpan?.serviceName || '',
		isDarkMode ? themeColors.chartcolors : themeColors.lightModeColor,
	);

	function getItems(span: Span, startTime: number): TabsProps['items'] {
		return [
			{
				label: (
					<Button
						type="text"
						icon={<Bookmark size="14" />}
						className="attributes-tab-btn"
					>
						Attributes
					</Button>
				),
				key: 'attributes',
				children: <Attributes span={span} isSearchVisible={isSearchVisible} />,
			},
			{
				label: (
					<Button type="text" icon={<Anvil size="14" />} className="events-tab-btn">
						Events
					</Button>
				),
				key: 'events',
				children: (
					<Events
						span={span}
						startTime={startTime}
						isSearchVisible={isSearchVisible}
					/>
				),
			},
		];
	}

	return (
		<div
			className={cx(
				'span-details-drawer',
				isSpanDetailsDocked ? 'span-details-drawer-docked' : '',
			)}
		>
			<section className="header">
				{!isSpanDetailsDocked && (
					<div className="heading">
						<div className="dot" />
						<Typography.Text className="text">Span Details</Typography.Text>
					</div>
				)}
				<PanelRight
					size={14}
					cursor="pointer"
					onClick={(): void => setIsSpanDetailsDocked((prev) => !prev)}
				/>
			</section>
			{selectedSpan && !isSpanDetailsDocked && (
				<>
					<section className="description">
						<div className="item">
							<Typography.Text className="attribute-key">span name</Typography.Text>
							<Typography.Text className="attribute-value">
								{selectedSpan.name}
							</Typography.Text>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span id</Typography.Text>
							<Typography.Text className="attribute-value">
								{selectedSpan.spanId}
							</Typography.Text>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">start time</Typography.Text>
							<Typography.Text className="attribute-value">
								{formatEpochTimestamp(selectedSpan.timestamp)}
							</Typography.Text>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">duration</Typography.Text>
							<Typography.Text className="attribute-value">
								{getYAxisFormattedValue(`${selectedSpan.durationNano}`, 'ns')}
							</Typography.Text>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">service</Typography.Text>
							<div className="service">
								<div className="dot" style={{ backgroundColor: color }} />
								<Typography.Text className="service-value">
									{selectedSpan.serviceName}
								</Typography.Text>
							</div>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">span kind</Typography.Text>
							<Typography.Text className="attribute-value">
								{selectedSpan.spanKind}
							</Typography.Text>
						</div>
						<div className="item">
							<Typography.Text className="attribute-key">
								status code string
							</Typography.Text>
							<Typography.Text className="attribute-value">
								{selectedSpan.statusCodeString}
							</Typography.Text>
						</div>
					</section>

					<section className="attributes-events">
						<Tabs
							items={getItems(selectedSpan, traceStartTime)}
							addIcon
							defaultActiveKey="attributes"
							className="details-drawer-tabs"
							tabBarExtraContent={
								<Search
									size={14}
									className="search-icon"
									cursor="pointer"
									onClick={(): void => setIsSearchVisible((prev) => !prev)}
								/>
							}
						/>
					</section>
				</>
			)}
		</div>
	);
}

export default SpanDetailsDrawer;
