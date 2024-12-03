import './ToolbarActions.styles.scss';

import { LoadingOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
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
					<Button
						className="btn-query-run"
						type="primary"
						onClick={(): void => {
							if (listQueryKeyRef?.current) {
								queryClient.cancelQueries(listQueryKeyRef.current);
							}
							if (chartQueryKeyRef?.current) {
								queryClient.cancelQueries(chartQueryKeyRef.current);
							}
						}}
					>
						<div className="btn-query-run__content">
							<X className="btn-query-run__icon" size={14} />
							<span className="btn-query-run__text">Cancel Run</span>
						</div>

						{isLoadingQueries && (
							<Spin
								indicator={<LoadingOutlined spin style={{ color: '#fff' }} />}
								size="small"
							/>
						)}
					</Button>
				</div>
			) : (
				<Button
					type="primary"
					className="btn-query-run"
					disabled={isLoadingQueries}
					onClick={onStageRunQuery}
				>
					<div className="btn-query-run__content">
						<Play className="btn-query-run__icon" size={14} />
						<span className="btn-query-run__text">Stage & Run Query</span>
					</div>
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
