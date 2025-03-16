import './TracesFunnels.styles.scss';

import { Skeleton } from 'antd';
import { useFunnelsList } from 'hooks/useFunnels/useFunnels';
import { useNotifications } from 'hooks/useNotifications';
import { ChangeEvent, useState } from 'react';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelsEmptyState from './components/FunnelsEmptyState/FunnelsEmptyState';
import FunnelsList from './components/FunnelsList/FunnelsList';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';

interface SortOrder {
	columnKey: string;
	order: 'ascend' | 'descend';
}

interface TracesFunnelsContentRendererProps {
	isLoading: boolean;
	isError: boolean;
	data: FunnelData[];
}
function TracesFunnelsContentRenderer({
	isLoading,
	isError,
	data,
}: TracesFunnelsContentRendererProps): JSX.Element {
	const [searchValue, setSearchValue] = useState<string>('');
	const [sortOrder, setSortOrder] = useState<SortOrder>({
		columnKey: 'creation_timestamp',
		order: 'descend',
	});

	const { notifications } = useNotifications();

	const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
		setSearchValue(e.target.value);
		// Implement search functionality here
	};

	const handleSort = (key: string): void => {
		setSortOrder({
			columnKey: key,
			order: 'descend',
		});
		// Implement sort functionality here
	};

	const handleDelete = (id: string): void => {
		// Implement delete functionality here
		console.log('delete', id);
		notifications.success({
			message: 'Funnel deleted successfully',
		});
	};
	const handleRename = (id: string): void => {
		// Implement delete functionality here
		console.log('rename', id);
		notifications.success({
			message: 'Funnel renamed successfully',
		});
	};

	const handleCreateFunnel = (): void => {
		console.log('create funnel');
	};

	if (isLoading) {
		return (
			<div className="traces-funnels__loading">
				{Array(6)
					.fill(0)
					.map((item, index) => (
						<Skeleton.Button
							// eslint-disable-next-line react/no-array-index-key
							key={`skeleton-item ${index}`}
							active
							size="large"
							shape="default"
							block
							className="traces-funnels__loading-skeleton"
						/>
					))}
			</div>
		);
	}

	if (isError) {
		return <div>Something went wrong</div>;
	}

	if (data.length === 0) {
		return <FunnelsEmptyState onCreateFunnel={handleCreateFunnel} />;
	}

	return (
		<>
			<SearchBar
				searchValue={searchValue}
				sortOrder={sortOrder}
				onSearch={handleSearch}
				onSort={handleSort}
			/>

			<FunnelsList data={data} onDelete={handleDelete} onRename={handleRename} />
		</>
	);
}

function TracesFunnels(): JSX.Element {
	const { data, isLoading, isError } = useFunnelsList();

	const funnelsListData = data?.payload || [];

	return (
		<div className="traces-funnels">
			<div className="traces-funnels__content">
				<Header />
				<TracesFunnelsContentRenderer
					isError={isError}
					isLoading={isLoading}
					data={funnelsListData}
				/>
			</div>
		</div>
	);
}

export default TracesFunnels;
