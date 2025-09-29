import './CreateAlertV2.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import { buildInitialAlertDef } from './context/utils';
import CreateAlertHeader from './CreateAlertHeader';
import EvaluationSettings from './EvaluationSettings';
import Footer from './Footer';
import NotificationSettings from './NotificationSettings';
import QuerySection from './QuerySection';
import { CreateAlertV2Props } from './types';
import { showCondensedLayout, Spinner } from './utils';

function CreateAlertV2({ alertType }: CreateAlertV2Props): JSX.Element {
	const queryToRedirect = buildInitialAlertDef(alertType);
	const currentQueryToRedirect = mapQueryDataFromApi(
		queryToRedirect.condition.compositeQuery,
	);

	useShareBuilderUrl({ defaultValue: currentQueryToRedirect });

	const showCondensedLayoutFlag = showCondensedLayout();

	return (
		<CreateAlertProvider initialAlertType={alertType}>
			<Spinner />
			<div className="create-alert-v2-container">
				<CreateAlertHeader />
				<QuerySection />
				<AlertCondition />
				{!showCondensedLayoutFlag ? <EvaluationSettings /> : null}
				<NotificationSettings />
			</div>
			<Footer />
		</CreateAlertProvider>
	);
}

CreateAlertV2.defaultProps = {
	initialQuery: initialQueriesMap.metrics,
};

export default CreateAlertV2;
