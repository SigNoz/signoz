/* eslint-disable */
//@ts-nocheck

import { Select, Space, Typography } from 'antd';
import Graph from 'components/Graph';
import { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { GetService, getUsageData, UsageDataItem } from 'store/actions';
import { AppState } from 'store/reducers';
import { GlobalTime } from 'types/actions/globalTime';
import { GlobalReducer } from 'types/reducer/globalTime';
import MetricReducer from 'types/reducer/metrics';
import { isOnboardingSkipped } from 'utils/app';

import { Card } from './styles';

const { Option } = Select;

interface UsageExplorerProps {
	usageData: UsageDataItem[];
	getUsageData: (
		minTime: number,
		maxTime: number,
		selectedInterval: number,
		selectedService: string,
	) => void;
	getServicesList: ({
		selectedTimeInterval,
	}: {
		selectedTimeInterval: GlobalReducer['selectedTime'];
	}) => void;
	globalTime: GlobalTime;
	servicesList: servicesListItem[];
	totalCount: number;
}
const timeDaysOptions = [
	{ value: 30, label: 'Last 30 Days' },
	{ value: 7, label: 'Last week' },
	{ value: 1, label: 'Last day' },
];

const interval = [
	{
		value: 604800,
		chartDivideMultiplier: 1,
		label: 'Weekly',
		applicableOn: [timeDaysOptions[0]],
	},
	{
		value: 86400,
		chartDivideMultiplier: 30,
		label: 'Daily',
		applicableOn: [timeDaysOptions[0], timeDaysOptions[1]],
	},
	{
		value: 3600,
		chartDivideMultiplier: 10,
		label: 'Hours',
		applicableOn: [timeDaysOptions[2], timeDaysOptions[1]],
	},
];

function _UsageExplorer(props: UsageExplorerProps): JSX.Element {
	const [selectedTime, setSelectedTime] = useState(timeDaysOptions[1]);
	const [selectedInterval, setSelectedInterval] = useState(interval[2]);
	const [selectedService, setSelectedService] = useState<string>('');
	const { selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const {
		getServicesList,
		getUsageData,
		globalTime,
		totalCount,
		usageData,
	} = props;
	const { services } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	useEffect(() => {
		if (selectedTime && selectedInterval) {
			const maxTime = new Date().getTime() * 1000000;
			const minTime = maxTime - selectedTime.value * 24 * 3600000 * 1000000;

			getUsageData(minTime, maxTime, selectedInterval.value, selectedService);
		}
	}, [selectedTime, selectedInterval, selectedService, getUsageData]);

	useEffect(() => {
		getServicesList({
			selectedTimeInterval: globalSelectedTime,
		});
	}, [globalTime, getServicesList, globalSelectedTime]);

	const data = {
		labels: usageData.map((s) => new Date(s.timestamp / 1000000)),
		datasets: [
			{
				label: 'Span Count',
				data: usageData.map((s) => s.count),
				backgroundColor: 'rgba(255, 99, 132, 0.2)',
				borderColor: 'rgba(255, 99, 132, 1)',
				borderWidth: 2,
			},
		],
	};

	return (
		<>
			<Space style={{ marginTop: 40, marginLeft: 20 }}>
				<Space>
					<Select
						onSelect={(value): void => {
							setSelectedTime(
								timeDaysOptions.filter((item) => item.value == parseInt(value))[0],
							);
						}}
						value={selectedTime.label}
					>
						{timeDaysOptions.map(({ value, label }) => (
							<Option key={value} value={value}>
								{label}
							</Option>
						))}
					</Select>
				</Space>
				<Space>
					<Select
						onSelect={(value): void => {
							setSelectedInterval(
								interval.filter((item) => item.value === parseInt(value))[0],
							);
						}}
						value={selectedInterval.label}
					>
						{interval
							.filter((interval) => interval.applicableOn.includes(selectedTime))
							.map((item) => (
								<Option key={item.label} value={item.value}>
									{item.label}
								</Option>
							))}
					</Select>
				</Space>

				<Space>
					<Select
						onSelect={(value): void => {
							setSelectedService(value);
						}}
						value={selectedService || 'All Services'}
					>
						<Option value="">All Services</Option>
						{services?.map((service) => (
							<Option key={service.serviceName} value={service.serviceName}>
								{service.serviceName}
							</Option>
						))}
					</Select>
				</Space>

				{isOnboardingSkipped() && totalCount === 0 ? (
					<Space
						style={{
							width: '100%',
							margin: '40px 0',
							marginLeft: 20,
							justifyContent: 'center',
						}}
					>
						<Typography>
							No spans found. Please add instrumentation (follow this
							<a
								href="https://signoz.io/docs/instrumentation/overview"
								target="_blank"
								style={{ marginLeft: 3 }}
								rel="noreferrer"
							>
								guide
							</a>
							)
						</Typography>
					</Space>
				) : (
					<Space style={{ display: 'block', marginLeft: 20, width: 200 }}>
						<Typography>{`Total count is ${totalCount}`}</Typography>
					</Space>
				)}
			</Space>

			<Card>
				<Graph name="usage" data={data} type="bar" />
			</Card>
		</>
	);
}

const mapStateToProps = (
	state: AppState,
): {
	totalCount: number;
	globalTime: GlobalTime;
	usageData: UsageDataItem[];
} => {
	let totalCount = 0;
	for (const item of state.usageDate) {
		totalCount += item.count;
	}
	return {
		totalCount,
		usageData: state.usageDate,
		globalTime: state.globalTime,
	};
};

export const UsageExplorer = withRouter(
	connect(mapStateToProps, {
		getUsageData,
		getServicesList: GetService,
	})(_UsageExplorer),
);
