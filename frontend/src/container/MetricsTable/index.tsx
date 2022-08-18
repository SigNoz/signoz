import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Space, Table } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ROUTES from 'constants/routes';
import React, { useRef, useState } from 'react';
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
	const [setSearchText] = useState('');
	const [setSearchedColumn] = useState('');
	const searchInput = useRef(null);

	const { services, loading, error } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	if (
		services.length === 0 &&
		loading === false &&
		!skipOnboarding &&
		error === true
	) {
		return <SkipBoardModal onContinueClick={onContinueClick} />;
	}

	const handleSearch = (selectedKeys, confirm, dataIndex): void => {
		confirm();
		setSearchText(selectedKeys[0]);
		setSearchedColumn(dataIndex);
	};

	const handleReset = (clearFilters): void => {
		clearFilters();
		setSearchText('');
	};

	const getColumnSearchProps = (dataIndex) => ({
		filterDropdown: ({
			setSelectedKeys,
			selectedKeys,
			confirm,
			clearFilters,
		}): JSX.Element => (
			<div
				style={{
					padding: 8,
				}}
			>
				<Input
					ref={searchInput}
					placeholder={`Search ${dataIndex}`}
					value={selectedKeys[0]}
					onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
					onPressEnter={() => handleSearch(selectedKeys, confirm, dataIndex)}
					style={{
						marginBottom: 8,
						display: 'block',
					}}
				/>
				<Space>
					<Button
						type="primary"
						onClick={() => handleSearch(selectedKeys, confirm, dataIndex)}
						icon={<SearchOutlined />}
						size="large"
						style={{
							width: 90,
						}}
					>
						Search
					</Button>
					<Button
						onClick={() => clearFilters && handleReset(clearFilters)}
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
						onClick={() => {
							confirm({
								closeDropdown: false,
							});
							setSearchText(selectedKeys[0]);
							setSearchedColumn(dataIndex);
						}}
					>
						Filter
					</Button>
				</Space>
			</div>
		),
		filterIcon: (filtered): JSX.Element => (
			<SearchOutlined
				style={{
					color: filtered ? '#1890ff' : undefined,
				}}
			/>
		),
		onFilter: (value, record): boolean =>
			record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()),
		onFilterDropdownVisibleChange: (visible): void => {
			if (visible) {
				setTimeout(() => searchInput.current?.select(), 100);
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
