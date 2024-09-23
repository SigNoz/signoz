import { useState } from 'react';
import { Dashboard } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import ExportPanelContainer from './ExportPanelContainer';

function ExportPanel({
	isLoading,
	onExport,
	query,
}: ExportPanelProps): JSX.Element | null {
	const [isExport, setIsExport] = useState<boolean>(false);

	const onDiscard = (): void => {
		setIsExport(false);
	};

	return isExport ? (
		<ExportPanelContainer
			query={query}
			isLoading={isLoading}
			onExport={onExport}
			onDiscard={onDiscard}
		/>
	) : null;
}

export interface ExportPanelProps {
	isLoading?: boolean;
	onExport: (dashboard: Dashboard | null, isNewDashboard?: boolean) => void;
	// eslint-disable-next-line react/no-unused-prop-types
	onDiscard: () => void;
	query: Query | null;
}

ExportPanel.defaultProps = { isLoading: false };

export default ExportPanel;
