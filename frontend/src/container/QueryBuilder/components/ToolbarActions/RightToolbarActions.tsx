import { MutableRefObject, useEffect } from 'react';
import { useQueryClient } from 'react-query';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';

import RunQueryBtn from '../RunQueryBtn/RunQueryBtn';

import './ToolbarActions.styles.scss';

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
		if (showLiveLogs) {
			return;
		}

		registerShortcut(LogsExplorerShortcuts.StageAndRunQuery, onStageRunQuery);

		return (): void => {
			deregisterShortcut(LogsExplorerShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onStageRunQuery, showLiveLogs]);

	if (showLiveLogs) {
		return (
			<div className="right-toolbar-actions-container">
				<RunQueryBtn />
			</div>
		);
	}

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
			<RunQueryBtn
				isLoadingQueries={isLoadingQueries}
				handleCancelQuery={handleCancelQuery}
				onStageRunQuery={onStageRunQuery}
			/>
		</div>
	);
}

RightToolbarActions.defaultProps = {
	isLoadingQueries: false,
	listQueryKeyRef: null,
	chartQueryKeyRef: null,
	showLiveLogs: false,
};
