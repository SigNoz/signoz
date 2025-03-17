import './TracesFunnels.styles.scss';

import { Skeleton } from 'antd';
import { useFunnelsList } from 'hooks/TracesFunnels/useFunnels';
import useHandleTraceFunnelsSearch from 'hooks/TracesFunnels/useHandleTraceFunnelsSearch';
import useHandleTraceFunnelsSort from 'hooks/TracesFunnels/useHandleTraceFunnelsSort';
import { useNotifications } from 'hooks/useNotifications';
import { FunnelData } from 'types/api/traceFunnels';

import FunnelsEmptyState from './components/FunnelsEmptyState/FunnelsEmptyState';
import FunnelsList from './components/FunnelsList/FunnelsList';
import Header from './components/Header/Header';
import SearchBar from './components/SearchBar/SearchBar';

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
	const { notifications } = useNotifications();

	const handleDelete = (id: string): void => {
		// Implement delete functionality here
		console.log('delete', id);
		notifications.success({
			message: 'Funnel deleted successfully',
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

	return <FunnelsList data={data} onDelete={handleDelete} />;
}

function TracesFunnels(): JSX.Element {
	const { searchQuery, handleSearch } = useHandleTraceFunnelsSearch();

	const { data, isLoading, isError } = useFunnelsList({ searchQuery });

	const { sortOrder, handleSort, sortedData } = useHandleTraceFunnelsSort({
		data: data?.payload || [],
	});

	return (
		<div className="traces-funnels">
			<div className="traces-funnels__content">
				<Header />
				<SearchBar
					searchQuery={searchQuery}
					sortOrder={sortOrder}
					onSearch={handleSearch}
					onSort={handleSort}
				/>
				<TracesFunnelsContentRenderer
					isError={isError}
					isLoading={isLoading}
					data={sortedData}
				/>
			</div>
		</div>
	);
}

export default TracesFunnels;
