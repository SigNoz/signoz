import './CreateAlertV2.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import CreateAlertHeader from './CreateAlertHeader';
import EvaluationSettings from './EvaluationSettings';
import NotificationSettings from './NotificationSettings';
import QuerySection from './QuerySection';
import { showCondensedLayout } from './utils';

function CreateAlertV2({
	initialQuery = initialQueriesMap.metrics,
}: {
	initialQuery?: Query;
}): JSX.Element {
	useShareBuilderUrl({ defaultValue: initialQuery });

	const showCondensedLayoutFlag = showCondensedLayout();

	return (
		<CreateAlertProvider>
			<div className="create-alert-v2-container">
				<CreateAlertHeader />
				<QuerySection />
				<AlertCondition />
				{!showCondensedLayoutFlag ? <EvaluationSettings /> : null}
				<NotificationSettings />
			</div>
		</CreateAlertProvider>
	);
}

CreateAlertV2.defaultProps = {
	initialQuery: initialQueriesMap.metrics,
};

export default CreateAlertV2;
