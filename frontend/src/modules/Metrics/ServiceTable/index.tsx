import { Button, Space, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import Modal from 'components/Modal';
import Spinner from 'components/Spinner';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ROUTES from 'constants/routes';
import React, { useCallback, useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { NavLink } from 'react-router-dom';
import { getServicesList, GlobalTime } from 'store/actions';
import { servicesListItem } from 'store/actions/MetricsActions';
import { AppState } from 'store/reducers';

import { Wrapper } from './styles';

const _ServicesTable = (props: ServicesTableProps): JSX.Element => {
	const [initialDataFetch, setDataFetched] = useState(false);
	const [errorObject, setErrorObject] = useState({
		message: '',
		isError: false,
	});
	const isEmptyServiceList =
		!initialDataFetch && props.servicesList.length === 0;
	const refetchFromBackend = isEmptyServiceList || errorObject.isError;
	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorage.getItem(SKIP_ONBOARDING) === 'true',
	);

	const onContinueClick = (): void => {
		localStorage.setItem(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	const { globalTime, getServicesList } = props;

	const getApiServiceData = useCallback(() => {
		getServicesList(globalTime)
			.then(() => {
				setDataFetched(true);
				setErrorObject({ message: '', isError: false });
			})
			.catch((e: string) => {
				setErrorObject({ message: e, isError: true });
				setDataFetched(true);
			});
	}, [globalTime, getServicesList]);

	useEffect(() => {
		getApiServiceData();
	}, [globalTime, getApiServiceData]);

	useEffect(() => {
		if (props.servicesList.length > 1) {
			localStorage.removeItem(SKIP_ONBOARDING);
		}
	}, [props.servicesList, errorObject]);

	if (!initialDataFetch) {
		return <Spinner height="90vh" size="large" tip="Fetching data..." />;
	}

	if (refetchFromBackend && !skipOnboarding) {
		return (
			<Modal
				title={'Setup instrumentation'}
				isModalVisible={true}
				closable={false}
				footer={[
					<Button key="submit" type="primary" onClick={onContinueClick}>
						Continue without instrumentation
					</Button>,
				]}
			>
				<div>
					<iframe
						width="100%"
						height="265"
						src="https://www.youtube.com/embed/Ly34WBQ2640"
						frameBorder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowFullScreen
					></iframe>
					<div>
						No instrumentation data.
						<br />
						Please instrument your application as mentioned{' '}
						<a
							href={'https://signoz.io/docs/instrumentation/overview'}
							target={'_blank'}
							rel="noreferrer"
						>
							here
						</a>
					</div>
				</div>
			</Modal>
		);
	}

	const columns: ColumnsType<DataProps> = [
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
			// eslint-disable-next-line react/display-name
			render: (text: string): JSX.Element => (
				<NavLink
					style={{ textTransform: 'capitalize' }}
					to={ROUTES.APPLICATION + '/' + text}
				>
					<strong>{text}</strong>
				</NavLink>
			),
		},
		{
			title: 'P99 latency (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'Error Rate (in %)',
			dataIndex: 'errorRate',
			key: 'errorRate',
			sorter: (a: DataProps, b: DataProps): number => a.errorRate - b.errorRate,
			render: (value: number): string => value.toFixed(2),
		},
		{
			title: 'Requests Per Second',
			dataIndex: 'callRate',
			key: 'callRate',
			sorter: (a: DataProps, b: DataProps): number => a.callRate - b.callRate,
			render: (value: number): string => value.toFixed(2),
		},
	];

	return (
		<Wrapper>
			<Table
				dataSource={props.servicesList}
				columns={columns}
				pagination={false}
			/>

			{props.servicesList[0] !== undefined &&
				props.servicesList[0].numCalls === 0 && (
					<Space
						style={{ width: '100%', margin: '40px 0', justifyContent: 'center' }}
					>
						No applications present. Please add instrumentation (follow this
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
				)}
		</Wrapper>
	);
};

type DataProps = servicesListItem;

interface ServicesTableProps {
	servicesList: servicesListItem[];
	getServicesList: (props: GlobalTime) => Promise<void>;
	globalTime: GlobalTime;
}

const mapStateToProps = (
	state: AppState,
): { servicesList: servicesListItem[]; globalTime: GlobalTime } => {
	return {
		servicesList: state.metricsData.serviceList,
		globalTime: state.globalTime,
	};
};

export const ServicesTable = connect(mapStateToProps, {
	getServicesList: getServicesList,
})(_ServicesTable);
