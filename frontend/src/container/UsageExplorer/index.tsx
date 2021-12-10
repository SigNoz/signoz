import { Select, Space } from 'antd';
import Graph from 'components/Graph';
import React from 'react';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { timeDaysOptions } from 'store/reducers/usage';
import { UsageReducer } from 'types/reducer/usage';
import { isOnboardingSkipped } from 'utils/app';
const { Option } = Select;
import Spinner from 'components/Spinner';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateSelectedInterval,
	updateSelectedInterval as updateSelectedIntervalAction,
} from 'store/actions/usages/updateSelectedInterval';
import {
	UpdateSelectedService,
	updateSelectedService,
} from 'store/actions/usages/updateSelectedService';
import {
	UpdateSelectedTime,
	updateSelectedTime as updateSelectedTimeAction,
} from 'store/actions/usages/updateSelectedTime';
import { Allinterval } from 'store/reducers/usage';
import AppActions from 'types/actions';

import { CardContainer, CardWrapper } from './styles';

const UsageExplorer = ({
	updateSelectedInterval,
	updateSelectedTime,
	updateSelectedService,
}: UsageExplorerProps): JSX.Element => {
	const {
		selectedInterval,
		selectedService,
		allService,
		data,
		selectedTime,
		loading,
	} = useSelector<AppState, UsageReducer>((state) => state.usage);

	const graphData = {
		labels: data.map((s) => new Date(s.timestamp / 1000000)),
		datasets: [
			{
				label: 'Span Count',
				data: data.map((s) => s.count),
				backgroundColor: 'rgba(255, 99, 132, 0.2)',
				borderColor: 'rgba(255, 99, 132, 1)',
				borderWidth: 2,
			},
		],
	};

	const totalCount = data.map((e) => e.count).reduce((acc, cur) => acc + cur, 0);

	return (
		<React.Fragment>
			<Space style={{ marginTop: 40, marginLeft: 20 }}>
				<Space>
					<Select
						onSelect={(value): void => {
							updateSelectedTime({
								selectedTime: timeDaysOptions.filter(
									(item) => item.value == parseInt(value),
								)[0],
							});
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
							updateSelectedInterval({
								selectedInterval: Allinterval.filter(
									(item) => item.value === parseInt(value),
								)[0],
							});
						}}
						value={selectedInterval.label}
					>
						{Allinterval.filter((interval) =>
							interval.applicableOn.includes(selectedTime),
						).map((item) => (
							<Option key={item.label} value={item.value}>
								{item.label}
							</Option>
						))}
					</Select>
				</Space>

				<Space>
					<Select
						onSelect={(value): void => {
							updateSelectedService({
								selectedService: value,
							});
						}}
						value={selectedService || 'All Services'}
					>
						<Option value={''}>All Services</Option>
						{allService?.map((service) => (
							<Option key={service.serviceName} value={service.serviceName}>
								{service.serviceName}
							</Option>
						))}
					</Select>
				</Space>

				<>
					{!loading && (
						<>
							{isOnboardingSkipped() && totalCount === 0 ? (
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
										style={{ marginLeft: 3 }}
										rel="noreferrer"
									>
										guide
									</a>
									)
								</Space>
							) : (
								<Space style={{ display: 'block', marginLeft: 20, width: 200 }}>
									{`Total count is ${totalCount}`}
								</Space>
							)}
						</>
					)}
				</>
			</Space>

			<CardWrapper>
				{loading ? (
					<Spinner tip="Loading Data..." height="80vh" />
				) : (
					<CardContainer>
						<Graph name="usage_explorer" data={graphData} type="bar" />
					</CardContainer>
				)}
			</CardWrapper>
		</React.Fragment>
	);
};

interface DispatchProps {
	updateSelectedInterval: (props: UpdateSelectedInterval) => void;
	updateSelectedTime: (props: UpdateSelectedTime) => void;
	updateSelectedService: (props: UpdateSelectedService) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateSelectedInterval: bindActionCreators(
		updateSelectedIntervalAction,
		dispatch,
	),
	updateSelectedTime: bindActionCreators(updateSelectedTimeAction, dispatch),
	updateSelectedService: bindActionCreators(updateSelectedService, dispatch),
});

type UsageExplorerProps = DispatchProps;

export default connect(null, mapDispatchToProps)(UsageExplorer);
