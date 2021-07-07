import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Button, Space, Spin, Table } from 'antd';
import styled from 'styled-components';
import { connect } from 'react-redux';
import { SKIP_ONBOARDING } from 'Src/constants/onboarding';
import ROUTES from 'Src/constants/routes';
import { getServicesList, GlobalTime } from '../../store/actions';
import { servicesListItem } from '../../store/actions/MetricsActions';
import { StoreState } from '../../store/reducers';
import { CustomModal } from '../../components/Modal';

interface ServicesTableProps {
	servicesList: servicesListItem[];
	getServicesList: Function;
	globalTime: GlobalTime;
}

const Wrapper = styled.div`
	padding-top: 40px;
	padding-bottom: 40px;
	padding-left: 40px;
	padding-right: 40px;
	.ant-table table {
		font-size: 12px;
	}
	.ant-table tfoot > tr > td,
	.ant-table tfoot > tr > th,
	.ant-table-tbody > tr > td,
	.ant-table-thead > tr > th {
		padding: 10px;
	}
`;

const TableLoadingWrapper = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 80px;
`;

const LoadingText = styled.div`
	margin-left: 16px;
`;

const columns = [
	{
		title: 'Application',
		dataIndex: 'serviceName',
		key: 'serviceName',
		render: (text: string) => (
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
		sorter: (a: any, b: any) => a.p99 - b.p99,
		// sortDirections: ['descend', 'ascend'],
		render: (value: number) => (value / 1000000).toFixed(2),
	},
	{
		title: 'Error Rate (in %)',
		dataIndex: 'errorRate',
		key: 'errorRate',
		sorter: (a: any, b: any) => a.errorRate - b.errorRate,
		// sortDirections: ['descend', 'ascend'],
		render: (value: number) => value.toFixed(2),
	},
	{
		title: 'Requests Per Second',
		dataIndex: 'callRate',
		key: 'callRate',
		sorter: (a: any, b: any) => a.callRate - b.callRate,
		// sortDirections: ['descend', 'ascend'],
		render: (value: number) => value.toFixed(2),
	},
];

const _ServicesTable = (props: ServicesTableProps) => {
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

	const onContinueClick = () => {
		localStorage.setItem(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	function getApiServiceData() {
		props
			.getServicesList(props.globalTime)
			.then(() => {
				setDataFetched(true);
				setErrorObject({ message: '', isError: false });
			})
			.catch((e: string) => {
				setErrorObject({ message: e, isError: true });
				setDataFetched(true);
			});
	}

	useEffect(getApiServiceData, [props.globalTime]);
	useEffect(() => {
		if (props.servicesList.length > 1) {
			localStorage.removeItem(SKIP_ONBOARDING);
		}

		refetchFromBackend && setTimeout(getApiServiceData, 50000);
	}, [props.servicesList, errorObject]);

	if (!initialDataFetch) {
		return (
			<TableLoadingWrapper>
				<Spin />
				<LoadingText>Fetching data</LoadingText>
			</TableLoadingWrapper>
		);
	}

	if (refetchFromBackend && !skipOnboarding) {
		return (
			<CustomModal
				title={'Setup instrumentation'}
				isModalVisible={true}
				closable={false}
				setIsModalVisible={() => {}}
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
					<div style={{ margin: '20px 0' }}>
						<Spin />
					</div>
					<div>
						No instrumentation data.
						<br />
						Please instrument your application as mentioned{' '}
						<a
							href={'https://signoz.io/docs/instrumentation/overview'}
							target={'_blank'} rel="noreferrer"
						>
							here
						</a>
					</div>
				</div>
			</CustomModal>
		);
	}

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
						style={{ marginLeft: 3 }} rel="noreferrer"
					>
							guide
					</a>
						)
				</Space>
			)}
		</Wrapper>
	);
};

const mapStateToProps = (
	state: StoreState,
): { servicesList: servicesListItem[]; globalTime: GlobalTime } => {
	return {
		servicesList: state.metricsData.serviceList,
		globalTime: state.globalTime,
	};
};

export const ServicesTable = connect(mapStateToProps, {
	getServicesList: getServicesList,
})(_ServicesTable);
