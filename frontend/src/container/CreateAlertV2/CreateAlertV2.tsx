import './CreateAlertV2.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import CreateAlertHeader from './CreateAlertHeader';
import EvaluationSettings from './EvaluationSettings';
import Footer from './Footer';
import NotificationSettings from './NotificationSettings';
import QuerySection from './QuerySection';
import { CreateAlertV2Props } from './types';
import { showCondensedLayout, Spinner } from './utils';

function CreateAlertV2({
	initialQuery = initialQueriesMap.metrics,
	alertType,
}: CreateAlertV2Props): JSX.Element {
	useShareBuilderUrl({ defaultValue: initialQuery });

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
