import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ROUTES from 'constants/routes';
import React, { useCallback, useRef, useState } from 'react';
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
	const searchInput = useRef(null);

	const { services, loading, error } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};
	const handleSearch = (_, confirm): void => {
		confirm();
	};

	const handleReset = (clearFilters): void => {
		clearFilters();
	};

	const FilterIcon = useCallback(
		({ filtered }) => (
			<SearchOutlined
				style={{
					color: filtered ? '#1890ff' : undefined,
				}}
			/>
		),
		[],
	);

	const filterDropdown = useCallback(
		({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
			<div
				style={{
					padding: 8,
				}}
			>
				<Input
					ref={searchInput}
					placeholder="Search by service"
					value={selectedKeys[0]}
					onChange={(e): void =>
						setSelectedKeys(e.target.value ? [e.target.value] : [])
					}
					onPressEnter={(): void => handleSearch(selectedKeys, confirm)}
					style={{
						marginBottom: 8,
						display: 'block',
					}}
				/>
				<Space>
					<Button
						type="primary"
						onClick={(): void => handleSearch(selectedKeys, confirm)}
						icon={<SearchOutlined />}
						size="small"
						style={{
							width: 90,
						}}
					>
						Search
					</Button>
					<Button
						onClick={(): void => clearFilters && handleReset(clearFilters)}
						size="small"
						style={{
							width: 90,
						}}
					>
						Reset
					</Button>
					<Button
						type="link"
						size="small"
						onClick={(): void => {
							confirm({
								closeDropdown: false,
							});
						}}
					>
						Filter
					</Button>
				</Space>
			</div>
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

	const getColumnSearchProps = (dataIndex): ColumnsType<DataProps> => ({
		filterDropdown,
		filterIcon: FilterIcon,
		onFilter: (value, record): boolean =>
			record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
		onFilterDropdownVisibleChange: (visible): void => {
			if (visible) {
				setTimeout((): void => searchInput.current?.select(), 100);
			}
		},
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
