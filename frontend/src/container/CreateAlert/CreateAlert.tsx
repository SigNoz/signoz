import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import { buildInitialAlertDef } from './context/utils';
import CreateAlertHeader from './CreateAlertHeader';
import Footer from './Footer';
import NotificationSettings from './NotificationSettings';
import QuerySection from './QuerySection';
import { CreateAlertProps } from './types';
import { Spinner } from './utils';

import './CreateAlert.styles.scss';

function CreateAlert({ alertType }: CreateAlertProps): JSX.Element {
	const queryToRedirect = buildInitialAlertDef(alertType);
	const currentQueryToRedirect = mapQueryDataFromApi(
		queryToRedirect.condition.compositeQuery,
	);

	useShareBuilderUrl({ defaultValue: currentQueryToRedirect });

	return (
		<CreateAlertProvider initialAlertType={alertType}>
			<Spinner />
			<div className="create-alert-v2-container">
				<CreateAlertHeader />
				<QuerySection />
				<AlertCondition />
				<NotificationSettings />
			</div>
			<Footer />
		</CreateAlertProvider>
	);
}

CreateAlert.defaultProps = {
	initialQuery: initialQueriesMap.metrics,
};

export default CreateAlert;
