import { useHistory } from 'react-router-dom';
import { ConciergeBell } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import {
	EXPLORER_ACTION_EVENTS,
	getCreateAlertLink,
	getExplorerActionEventPayload,
} from './utils';

function CreateAlertButton({
	query,
	sourcepage,
	isOneChartPerQuery = false,
}: {
	query: Query | null;
	sourcepage: DataSource;
	isOneChartPerQuery?: boolean;
}): JSX.Element {
	const history = useHistory();
	const { panelType } = useQueryBuilder();

	const createAlert = (): void => {
		if (!query) {
			return;
		}
		void logEvent(
			EXPLORER_ACTION_EVENTS[sourcepage].createAlert,
			getExplorerActionEventPayload({ sourcepage, panelType, isOneChartPerQuery }),
		);
		history.push(getCreateAlertLink({ query, panelType }));
	};

	return isOneChartPerQuery ? (
		<Tooltip title="Create an alert">
			<Button
				variant="ghost"
				color="secondary"
				size="sm"
				icon
				disabled={!query}
				disabledTooltip="Run a query first"
				onClick={createAlert}
				aria-label="Create an alert"
				testId="explorer-create-alert"
			>
				<ConciergeBell size={16} />
			</Button>
		</Tooltip>
	) : (
		<Button
			variant="ghost"
			color="secondary"
			size="md"
			disabled={!query}
			disabledTooltip="Run a query first"
			onClick={createAlert}
			prefix={<ConciergeBell size={16} />}
			testId="explorer-create-alert"
		>
			Create an alert
		</Button>
	);
}

export default CreateAlertButton;
