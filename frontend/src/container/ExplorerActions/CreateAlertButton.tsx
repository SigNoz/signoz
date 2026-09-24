import { useHistory } from 'react-router-dom';
import { ConciergeBell } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { EXPLORER_ACTION_EVENTS, getCreateAlertLink } from './utils';

function CreateAlertButton({
	query,
	sourcepage,
	iconOnly = false,
}: {
	query: Query | null;
	sourcepage: DataSource;
	iconOnly?: boolean;
}): JSX.Element {
	const history = useHistory();
	const { panelType } = useQueryBuilder();

	const createAlert = (): void => {
		if (!query) {
			return;
		}
		void logEvent(EXPLORER_ACTION_EVENTS.createAlert, { sourcepage, panelType });
		history.push(getCreateAlertLink({ query, panelType }));
	};

	const button = (
		<Button
			variant="ghost"
			color="secondary"
			size={iconOnly ? 'icon' : 'md'}
			disabled={!query}
			onClick={createAlert}
			prefix={<ConciergeBell size={16} />}
			aria-label="Create an alert"
			data-testid="explorer-create-alert"
		>
			{!iconOnly && 'Create an alert'}
		</Button>
	);

	return iconOnly ? (
		<TooltipSimple title="Create an alert">{button}</TooltipSimple>
	) : (
		button
	);
}

export default CreateAlertButton;
