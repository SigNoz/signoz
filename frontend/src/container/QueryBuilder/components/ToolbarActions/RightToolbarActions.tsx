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
}

export default function RightToolbarActions({
	onStageRunQuery,
	isLoadingQueries,
	listQueryKeyRef,
	chartQueryKeyRef,
}: RightToolbarActionsProps): JSX.Element {
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const queryClient = useQueryClient();

	useEffect(() => {
		registerShortcut(LogsExplorerShortcuts.StageAndRunQuery, onStageRunQuery);

		return (): void => {
			deregisterShortcut(LogsExplorerShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [onStageRunQuery]);
	return (
		<div>
			{isLoadingQueries ? (
				<div className="loading-container">
					<Button className="loading-btn" loading={isLoadingQueries} />
					<Button
						icon={<X size={14} />}
						className="cancel-run"
						onClick={(): void => {
							if (listQueryKeyRef?.current) {
								queryClient.cancelQueries(listQueryKeyRef.current);
							}
							if (chartQueryKeyRef?.current) {
								queryClient.cancelQueries(chartQueryKeyRef.current);
							}
						}}
					>
						Cancel Run
					</Button>
				</div>
			) : (
				<Button
					type="primary"
					className="right-toolbar"
					disabled={isLoadingQueries}
					onClick={onStageRunQuery}
					icon={<Play size={14} />}
				>
					Stage & Run Query
				</Button>
			)}
		</div>
	);
}

RightToolbarActions.defaultProps = {
	isLoadingQueries: false,
	listQueryKeyRef: null,
	chartQueryKeyRef: null,
};
