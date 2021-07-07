import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Card, Select, Space } from 'antd';
import { connect } from 'react-redux';

import {
	getServicesList,
	getUsageData,
	GlobalTime,
	usageDataItem,
} from '../../store/actions';
import { StoreState } from '../../store/reducers';
import moment from 'moment';
import { isOnboardingSkipped } from '../../utils/app';
import { useRoute } from '../RouteProvider';
import { servicesListItem } from '../../store/actions/MetricsActions';
const { Option } = Select;

interface UsageExplorerProps {
	usageData: usageDataItem[];
	getUsageData: Function;
	getServicesList: Function;
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

const _UsageExplorer = (props: UsageExplorerProps) => {
	const [selectedTime, setSelectedTime] = useState(timeDaysOptions[1]);
	const [selectedInterval, setSelectedInterval] = useState(interval[2]);
	const [selectedService, setSelectedService] = useState<string>('');

	const { state } = useRoute();

	useEffect(() => {
		if (selectedTime && selectedInterval) {
			const maxTime = new Date().getTime() * 1000000;
			const minTime = maxTime - selectedTime.value * 24 * 3600000 * 1000000;

			props.getUsageData(
				minTime,
				maxTime,
				selectedInterval!.value,
				selectedService,
			);
		}
	}, [selectedTime, selectedInterval, selectedService]);

	useEffect(() => {
		/*
			Call the apis only when the route is loaded.
			Check this issue: https://github.com/SigNoz/signoz/issues/110
		 */
		if (state.USAGE_EXPLORER.isLoaded) {
			props.getServicesList(props.globalTime);
		}
	}, []);

	const data = {
		labels: props.usageData.map((s) =>
			moment(s.timestamp / 1000000).format('MMM Do h a'),
		),
		datasets: [
			{
				label: 'Span Count',
				data: props.usageData.map((s) => s.count),
				backgroundColor: 'rgba(255, 99, 132, 0.2)',
				borderColor: 'rgba(255, 99, 132, 1)',
				borderWidth: 2,
			},
		],
	};

	const options = {
		scales: {
			yAxes: [
				{
					ticks: {
						beginAtZero: true,
						fontSize: 10,
					},
				},
			],
		},
		legend: {
			display: false,
		},
	};

	return (
		<React.Fragment>
			{/* PNOTE - TODO - Keep it in reponsive row column tab */}
			<Space style={{ marginTop: 40, marginLeft: 20 }}>
				<Space>
					<Select
						onSelect={(value, option) => {
							setSelectedTime(
								timeDaysOptions.filter((item) => item.value == parseInt(value))[0],
							);
						}}
						value={selectedTime.label}
					>
						{timeDaysOptions.map(({ value, label }) => (
							<Option value={value}>{label}</Option>
						))}
					</Select>
				</Space>
				<Space>
					<Select
						onSelect={(value) => {
							setSelectedInterval(
								interval.filter((item) => item!.value === parseInt(value))[0],
							);
						}}
						value={selectedInterval!.label}
					>
						{interval
							.filter((interval) => interval!.applicableOn.includes(selectedTime))
							.map((item) => (
								<Option value={item!.value}>{item!.label}</Option>
							))}
					</Select>
				</Space>

				<Space>
					<Select
						onSelect={(value) => {
							setSelectedService(value);
						}}
						value={selectedService || 'All Services'}
					>
						<Option value={''}>All Services</Option>
						{props.servicesList.map((service) => (
							<Option value={service.serviceName}>{service.serviceName}</Option>
						))}
					</Select>
				</Space>

				{isOnboardingSkipped() && props.totalCount === 0 ? (
					<Space
						style={{
							width: '100%',
							margin: '40px 0',
							marginLeft: 20,
							justifyContent: 'center',
						}}
					>
						No spans found. Please add instrumentation (follow this
						<a
							href={'https://signoz.io/docs/instrumentation/overview'}
							target={'_blank'}
							style={{ marginLeft: 3 }} rel="noreferrer"
						>
							guide
						</a>
						)
					</Space>
				) : (
					<Space style={{ display: 'block', marginLeft: 20, width: 200 }}>
						{`Total count is ${props.totalCount}`}
					</Space>
				)}
			</Space>

			<Card style={{ width: '90%', margin: 20 }} bodyStyle={{ padding: 20 }}>
				<Bar data={data} options={options} />
			</Card>
		</React.Fragment>
	);
};

const mapStateToProps = (
	state: StoreState,
): {
	totalCount: number;
	globalTime: GlobalTime;
	servicesList: servicesListItem[];
	usageData: usageDataItem[];
} => {
	let totalCount = 0;
	for (const item of state.usageDate) {
		totalCount = totalCount + item.count;
	}
	return {
		totalCount: totalCount,
		usageData: state.usageDate,
		globalTime: state.globalTime,
		servicesList: state.metricsData.serviceList,
	};
};

export const UsageExplorer = connect(mapStateToProps, {
	getUsageData: getUsageData,
	getServicesList: getServicesList,
})(_UsageExplorer);
