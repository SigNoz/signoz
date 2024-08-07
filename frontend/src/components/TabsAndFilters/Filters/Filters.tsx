import { Button } from 'antd';
import { QueryParams } from 'constants/query';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { Undo } from 'lucide-react';
import { useHistory } from 'react-router-dom';

export function Filters(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();

	const handleFiltersReset = (): void => {
		urlQuery.delete(QueryParams.relativeTime);

		history.replace({
			pathname: history.location.pathname,
			search: `?${urlQuery.toString()}`,
		});
	};
	return (
		<div className="filters">
			{urlQuery.has(QueryParams.relativeTime) && (
				<Button
					type="default"
					className="reset-button"
					onClick={handleFiltersReset}
					icon={<Undo size={14} />}
				>
					Reset
				</Button>
			)}
			<DateTimeSelector showAutoRefresh={false} hideShareModal />
		</div>
	);
}
