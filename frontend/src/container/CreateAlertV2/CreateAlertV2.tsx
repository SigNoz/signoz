import './CreateAlertV2.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import CreateAlertHeader from './CreateAlertHeader';
import QuerySection from './QuerySection';

function CreateAlertV2({
	initialQuery = initialQueriesMap.metrics,
}: {
	initialQuery?: Query;
}): JSX.Element {
	useShareBuilderUrl({ defaultValue: initialQuery });

	return (
		<div className="create-alert-v2-container">
			<CreateAlertProvider>
				<CreateAlertHeader />
				<QuerySection />
				<AlertCondition />
			</CreateAlertProvider>
		</div>
	);
}

CreateAlertV2.defaultProps = {
	initialQuery: initialQueriesMap.metrics,
};

export default CreateAlertV2;
