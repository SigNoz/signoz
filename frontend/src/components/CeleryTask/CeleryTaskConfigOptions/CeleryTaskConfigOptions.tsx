import { Select, Spin } from 'antd';
import { navigate } from 'lib/router/navigation';
import { useAppLocation } from 'lib/router/useAppLocation';
import { Typography } from '@signozhq/ui/typography';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';

import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from '../CeleryUtils';
import { useCeleryFilterOptions } from '../useCeleryFilterOptions';

import './CeleryTaskConfigOptions.styles.scss';

function CeleryTaskConfigOptions(): JSX.Element {
	const { handleSearch, isFetching, options } =
		useCeleryFilterOptions('celery.task_name');
	const location = useAppLocation();

	const urlQuery = useUrlQuery();

	return (
		<div className="celery-task-filters">
			<div className="celery-filters">
				<Typography.Text style={{ whiteSpace: 'nowrap' }}>
					Task Name
				</Typography.Text>
				<Select
					placeholder="Task Name"
					showSearch
					mode="multiple"
					options={options}
					loading={isFetching}
					className="config-select-option"
					onSearch={handleSearch}
					maxTagCount={4}
					maxTagPlaceholder={SelectMaxTagPlaceholder}
					value={getValuesFromQueryParams(QueryParams.taskName, urlQuery) || []}
					notFoundContent={
						isFetching ? (
							<span>
								<Spin size="small" /> Loading...
							</span>
						) : (
							<span>No Task Name found</span>
						)
					}
					onChange={(value): void => {
						handleSearch('');
						setQueryParamsFromOptions(
							value,
							urlQuery,
							navigate,
							location,
							QueryParams.taskName,
						);
					}}
				/>
			</div>
		</div>
	);
}

export default CeleryTaskConfigOptions;
