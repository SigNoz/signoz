import { ConciergeBell } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useAppNavigate } from 'lib/router/useAppNavigate';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	EXPLORER_ACTION_EVENTS,
	ExplorerActionsSource,
	getCreateAlertLink,
	getExplorerActionEventPayload,
} from './utils';

function CreateAlertButton({
	query,
	sourcePage,
	isOneChartPerQuery = false,
}: {
	query: Query | null;
	sourcePage: ExplorerActionsSource;
	isOneChartPerQuery?: boolean;
}): JSX.Element {
	const navigate = useAppNavigate();
	const { panelType } = useQueryBuilder();

	const createAlert = (): void => {
		if (!query) {
			return;
		}
		void logEvent(
			EXPLORER_ACTION_EVENTS[sourcePage].createAlert,
			getExplorerActionEventPayload({ sourcePage, panelType, isOneChartPerQuery }),
		);
		navigate(getCreateAlertLink({ query, panelType }));
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
