import './CreateAlertV2.styles.scss';

import { initialQueriesMap } from 'constants/queryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useMemo } from 'react';

import AlertCondition from './AlertCondition';
import { CreateAlertProvider } from './context';
import { buildInitialAlertDef } from './context/utils';
import CreateAlertHeader from './CreateAlertHeader';
import EvaluationSettings from './EvaluationSettings';
import Footer from './Footer';
import NotificationSettings from './NotificationSettings';
import QuerySection from './QuerySection';
import { CreateAlertV2Props } from './types';
import {
	getCreateAlertLocalStateFromAlertDef,
	showCondensedLayout,
	Spinner,
} from './utils';

function CreateAlertV2({
	alertType,
	initialAlertDef,
	ruleId,
	isEditMode,
}: CreateAlertV2Props): JSX.Element {
	const currentQueryToRedirect = useMemo(() => {
		const basicAlertDef = buildInitialAlertDef(alertType);
		return mapQueryDataFromApi(
			initialAlertDef?.condition.compositeQuery ||
				basicAlertDef.condition.compositeQuery,
		);
	}, [initialAlertDef, alertType]);

	useShareBuilderUrl({ defaultValue: currentQueryToRedirect });

	const showCondensedLayoutFlag = showCondensedLayout();

	const initialAlertState = getCreateAlertLocalStateFromAlertDef(
		initialAlertDef,
	);

	return (
		<CreateAlertProvider
			initialAlertType={alertType}
			initialAlertState={initialAlertState}
			isEditMode={isEditMode}
			ruleId={ruleId}
		>
			<Spinner />
			<div className="create-alert-v2-container">
				{!isEditMode && <CreateAlertHeader />}
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
