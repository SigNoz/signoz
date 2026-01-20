import './ToolbarActions.styles.scss';

import { Button } from 'antd';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { Loader2, Play } from 'lucide-react';
import { MutableRefObject, useEffect } from 'react';
import { useQueryClient } from 'react-query';

interface RightToolbarActionsProps {
	onStageRunQuery: () => void;
	isLoadingQueries?: boolean;
	listQueryKeyRef?: MutableRefObject<any>;
	chartQueryKeyRef?: MutableRefObject<any>;
	showLiveLogs?: boolean;
}

export default function RightToolbarActions({
	onStageRunQuery,
	isLoadingQueries,
	listQueryKeyRef,
	chartQueryKeyRef,
	showLiveLogs,
}: RightToolbarActionsProps): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const queryClient = useQueryClient();

	useEffect(() => {
		if (showLiveLogs) return;

		registerShortcut(LogsExplorerShortcuts.StageAndRunQuery, onStageRunQuery);

		return (): void => {
			deregisterShortcut(LogsExplorerShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onStageRunQuery, showLiveLogs]);

	if (showLiveLogs)
		return (
			<div className="right-toolbar-actions-container">
				<Button
					type="primary"
					className="run-query-btn periscope-btn primary"
					disabled
					icon={<Play size={14} />}
				>
					Run Query
				</Button>
			</div>
		);

	const handleCancelQuery = (): void => {
		if (listQueryKeyRef?.current) {
			queryClient.cancelQueries(listQueryKeyRef.current);
		}
		if (chartQueryKeyRef?.current) {
			queryClient.cancelQueries(chartQueryKeyRef.current);
		}
	};

	return (
		<div className="right-toolbar-actions-container">
			{isLoadingQueries ? (
				<Button
					type="default"
					icon={<Loader2 size={14} className="loading-icon animate-spin" />}
					className="cancel-query-btn periscope-btn danger"
					onClick={handleCancelQuery}
				>
					Cancel
				</Button>
			) : (
				<Button
					type="primary"
					className="run-query-btn periscope-btn primary"
					disabled={isLoadingQueries}
					onClick={onStageRunQuery}
					icon={<Play size={14} />}
				>
					Run Query
				</Button>
			)}
		</div>
	);
}

RightToolbarActions.defaultProps = {
	isLoadingQueries: false,
	listQueryKeyRef: null,
	chartQueryKeyRef: null,
	showLiveLogs: false,
};
