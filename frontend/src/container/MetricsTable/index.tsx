import { blue } from '@ant-design/colors';
import { SearchOutlined } from '@ant-design/icons';
import { Button, Card, Input, Space, Table } from 'antd';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { FilterConfirmProps } from 'antd/es/table/interface';
import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ROUTES from 'constants/routes';
import React, { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ServicesList } from 'types/api/metrics/getService';
import MetricReducer from 'types/reducer/metrics';

import SkipBoardModal from './SkipOnBoardModal';
import { Container, Name } from './styles';

function Metrics(): JSX.Element {
	const { search } = useLocation();
	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorageGet(SKIP_ONBOARDING) === 'true',
	);

	const { services, loading, error } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};
	const handleSearch = (confirm: (param?: FilterConfirmProps) => void): void => {
		confirm();
	};

	const FilterIcon = useCallback(
		({ filtered }) => (
			<SearchOutlined
				style={{
					color: filtered ? blue[6] : undefined,
				}}
			/>
		),
		[],
	);

	const filterDropdown = useCallback(
		({ setSelectedKeys, selectedKeys, confirm }) => (
			<Card size="small">
				<Space align="start" direction="vertical">
					<Input
						placeholder="Search by service"
						value={selectedKeys[0]}
						onChange={(e): void =>
							setSelectedKeys(e.target.value ? [e.target.value] : [])
						}
						allowClear
						onPressEnter={(): void => handleSearch(confirm)}
					/>
					<Button
						type="primary"
						onClick={(): void => handleSearch(confirm)}
						icon={<SearchOutlined />}
						size="small"
					>
						Search
					</Button>
				</Space>
			</Card>
		),
		[],
	);

	if (
		services.length === 0 &&
		loading === false &&
		!skipOnboarding &&
		error === true
	) {
		return <SkipBoardModal onContinueClick={onContinueClick} />;
	}

	type DataIndex = keyof ServicesList;

	const getColumnSearchProps = (
		dataIndex: DataIndex,
	): ColumnType<DataProps> => ({
		filterDropdown,
		filterIcon: FilterIcon,
		onFilter: (value: string | number | boolean, record: DataProps): boolean =>
			record[dataIndex]
				.toString()
				.toLowerCase()
				.includes(value.toString().toLowerCase()),
		render: (text: string): JSX.Element => (
			<Link to={`${ROUTES.APPLICATION}/${text}${search}`}>
				<Name>{text}</Name>
			</Link>
		),
	});

	const columns: ColumnsType<DataProps> = [
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
			...getColumnSearchProps('serviceName'),
		},
		{
			title: 'P99 latency (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			defaultSortOrder: 'descend',
			sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'Error Rate (% of total)',
			dataIndex: 'errorRate',
			key: 'errorRate',
			sorter: (a: DataProps, b: DataProps): number => a.errorRate - b.errorRate,
			render: (value: number): string => value.toFixed(2),
		},
		{
			title: 'Operations Per Second',
			dataIndex: 'callRate',
			key: 'callRate',
			sorter: (a: DataProps, b: DataProps): number => a.callRate - b.callRate,
			render: (value: number): string => value.toFixed(2),
		},
	];

	return (
		<Container>
			<Table
				loading={loading}
				dataSource={services}
				columns={columns}
				rowKey="serviceName"
			/>
		</Container>
	);
}

type DataProps = ServicesList;

export default Metrics;
