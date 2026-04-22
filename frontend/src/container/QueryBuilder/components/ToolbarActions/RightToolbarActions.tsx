import { useEffect } from 'react';
import { LogsExplorerShortcuts } from 'constants/shortcuts/logsExplorerShortcuts';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';

import RunQueryBtn from '../RunQueryBtn/RunQueryBtn';

import './ToolbarActions.styles.scss';

interface RightToolbarActionsProps {
	onStageRunQuery: () => void;
	isLoadingQueries: boolean;
	handleCancelQuery: () => void;
	showLiveLogs?: boolean;
}

export default function RightToolbarActions({
	onStageRunQuery,
	isLoadingQueries,
	handleCancelQuery,
	showLiveLogs,
}: RightToolbarActionsProps): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

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
				<RunQueryBtn disabled />
			</div>
		);
	}

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
	showLiveLogs: false,
};
