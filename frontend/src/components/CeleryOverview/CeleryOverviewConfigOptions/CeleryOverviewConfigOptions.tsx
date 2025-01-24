import './CeleryOverviewConfigOptions.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Select, Spin, Tooltip } from 'antd';
import {
	getValuesFromQueryParams,
	setQueryParamsFromOptions,
} from 'components/CeleryTask/CeleryUtils';
import { useCeleryFilterOptions } from 'components/CeleryTask/useCeleryFilterOptions';
import { SelectMaxTagPlaceholder } from 'components/MessagingQueues/MQCommon/MQCommon';
import { QueryParams } from 'constants/query';
import useUrlQuery from 'hooks/useUrlQuery';
import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useCopyToClipboard } from 'react-use';

function CeleryOverviewConfigOptions(): JSX.Element {
	const { handleSearch, isFetching, options } = useCeleryFilterOptions(
		'serviceName',
	);
	const history = useHistory();
	const location = useLocation();

	const [isURLCopied, setIsURLCopied] = useState(false);
	const urlQuery = useUrlQuery();

	const [, handleCopyToClipboard] = useCopyToClipboard();

	return (
		<div className="celery-overview-filters">
			<div className="celery-filters">
				<Select
					placeholder="Service Name"
					showSearch
					mode="multiple"
					options={options}
					loading={isFetching}
					className="config-select-option"
					onSearch={handleSearch}
					maxTagCount={4}
					maxTagPlaceholder={SelectMaxTagPlaceholder}
					value={getValuesFromQueryParams(QueryParams.service, urlQuery) || []}
					notFoundContent={
						isFetching ? (
							<span>
								<Spin size="small" /> Loading...
							</span>
						) : (
							<span>No Service Name found</span>
						)
					}
					onChange={(value): void => {
						handleSearch('');
						setQueryParamsFromOptions(
							value,
							urlQuery,
							history,
							location,
							QueryParams.service,
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

export default CeleryOverviewConfigOptions;
