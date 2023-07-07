import LogDetail from 'components/LogDetail';

import { LogExplorerDetailedViewProps } from './LogExplorerDetailedView.interfaces';

function LogExplorerDetailedView({
	log,
	onClose,
}: LogExplorerDetailedViewProps): JSX.Element {
	const onDrawerClose = (): void => {
		onClose();
	};

	return <LogDetail log={log} onClose={onDrawerClose} />;
}

export default LogExplorerDetailedView;
