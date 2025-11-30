import './ToolbarActions.styles.scss';

import { Button } from 'antd';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { Play, X } from 'lucide-react';
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

	if (showLiveLogs) return <div />;

	return (
		<div className="right-toolbar">
			{isLoadingQueries ? (
				<div className="query-in-progress-container">
					<Button
						className="periscope-btn ghost query-in-progress-btn"
						loading={isLoadingQueries}
					/>
					<Button
						icon={<X size={14} />}
						className="periscope-btn secondary cancel-run"
						onClick={(): void => {
							if (listQueryKeyRef?.current) {
								queryClient.cancelQueries(listQueryKeyRef.current);
							}
							if (chartQueryKeyRef?.current) {
								queryClient.cancelQueries(chartQueryKeyRef.current);
							}
						}}
					>
						Cancel
					</Button>
				</div>
			) : (
				<Button
					type="primary"
					className="periscope-btn primary run-query-btn"
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
