import { useCallback } from 'react';
import { QueryKey, useIsFetching, useQueryClient } from 'react-query';
import { Button } from 'antd';
import cx from 'classnames';
import {
	ChevronUp,
	Command,
	CornerDownLeft,
	Loader2,
	Play,
} from 'lucide-react';
import { getUserOperatingSystem, UserOperatingSystem } from 'utils/getUserOS';

import './RunQueryBtn.scss';
interface RunQueryBtnProps {
	className?: string;
	label?: string;
	isLoadingQueries?: boolean;
	handleCancelQuery?: () => void;
	onStageRunQuery?: () => void;
	queryRangeKey?: QueryKey;
}

function RunQueryBtn({
	className,
	label,
	isLoadingQueries,
	handleCancelQuery,
	onStageRunQuery,
	queryRangeKey,
}: RunQueryBtnProps): JSX.Element {
	const isMac = getUserOperatingSystem() === UserOperatingSystem.MACOS;
	const queryClient = useQueryClient();
	const isKeyFetchingCount = useIsFetching(
		queryRangeKey as QueryKey | undefined,
	);
	const isLoading =
		typeof isLoadingQueries === 'boolean'
			? isLoadingQueries
			: isKeyFetchingCount > 0;

	const onCancel = useCallback(() => {
		if (handleCancelQuery) {
			return handleCancelQuery();
		}
		if (queryRangeKey) {
			queryClient.cancelQueries(queryRangeKey);
		}
	}, [handleCancelQuery, queryClient, queryRangeKey]);

	return isLoading ? (
		<Button
			type="default"
			icon={<Loader2 size={14} className="loading-icon animate-spin" />}
			className={cx('cancel-query-btn periscope-btn danger', className)}
			onClick={onCancel}
		>
			Cancel
		</Button>
	) : (
		<Button
			type="primary"
			className={cx('run-query-btn periscope-btn primary', className)}
			disabled={isLoading || !onStageRunQuery}
			onClick={onStageRunQuery}
			icon={<Play size={14} />}
		>
			{label || 'Run Query'}
			<div className="cmd-hint">
				{isMac ? <Command size={12} /> : <ChevronUp size={12} />}
				<CornerDownLeft size={12} />
			</div>
		</Button>
	);
}

export default RunQueryBtn;
