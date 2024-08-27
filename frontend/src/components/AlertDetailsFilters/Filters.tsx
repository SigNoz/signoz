import './filters.styles.scss';

import { Button } from 'antd';
import { QueryParams } from 'constants/query';
import { RelativeTimeMap } from 'container/TopNav/DateTimeSelection/config';
import DateTimeSelector from 'container/TopNav/DateTimeSelectionV2';
import useUrlQuery from 'hooks/useUrlQuery';
import { Undo } from 'lucide-react';
import { useHistory } from 'react-router-dom';

export function Filters(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const relativeTime = urlQuery.get(QueryParams.relativeTime);

	const handleFiltersReset = (): void => {
		urlQuery.set(QueryParams.relativeTime, RelativeTimeMap['30min']);
		urlQuery.delete(QueryParams.startTime);
		urlQuery.delete(QueryParams.endTime);
		history.replace({
			pathname: history.location.pathname,
			search: `?${urlQuery.toString()}`,
		});
	};
	return (
		<div className="filters">
			{relativeTime !== RelativeTimeMap['30min'] && (
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
