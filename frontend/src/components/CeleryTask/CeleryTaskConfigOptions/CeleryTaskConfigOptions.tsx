import { useHistory, useLocation } from 'react-router-dom';
import { ComboboxSimple } from '@signozhq/ui/combobox';
import { Typography } from '@signozhq/ui/typography';
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
	const history = useHistory();
	const location = useLocation();

	const urlQuery = useUrlQuery();

	return (
		<div className="celery-task-filters">
			<div className="celery-filters">
				<Typography.Text style={{ whiteSpace: 'nowrap' }}>
					Task Name
				</Typography.Text>
				<ComboboxSimple
					placeholder="Task Name"
					multiple
					items={options}
					loading={isFetching}
					className="config-select-option"
					value={getValuesFromQueryParams(QueryParams.taskName, urlQuery) || []}
					emptyPlaceholder="No Task Name found"
					onChange={(value): void => {
						handleSearch('');
						setQueryParamsFromOptions(
							value as string[],
							urlQuery,
							history,
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
