import './CeleryTaskConfigOptions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select, Spin, Tooltip, Typography } from 'antd';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';

import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from '../CeleryUtils';
import { useCeleryFilterOptions } from '../useCeleryFilterOptions';

function CeleryTaskConfigOptions(): JSX.Element {
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		'celery.task_name',
	);
	const history = useHistory();
	const location = useLocation();

	const [isURLCopied, setIsURLCopied] = useState(false);
	const urlQuery = useUrlQuery();

	const [, handleCopyToClipboard] = useCopyToClipboard();

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
							history,
							location,
							QueryParams.taskName,
						);
					}}
				/>
			</div>
			<Tooltip title="Share this" arrow={false}>
				<Button
					className="periscope-btn copy-url-btn"
					onClick={(): void => {
						handleCopyToClipboard(window.location.href);
						setIsURLCopied(true);
						setTimeout(() => {
							setIsURLCopied(false);
						}, 1000);
					}}
					icon={
						isURLCopied ? (
							<Check size={14} color={Color.BG_FOREST_500} />
						) : (
							<Share2 size={14} />
						)
					}
				/>
			</Tooltip>
		</div>
	);
}

export default CeleryTaskConfigOptions;
