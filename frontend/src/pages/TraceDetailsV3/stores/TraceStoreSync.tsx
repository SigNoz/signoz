import { ReactNode, useEffect } from 'react';
import { useMutation } from 'react-query';
import updateUserPreferenceAPI from 'api/v1/user/preferences/name/update';
import { useAppContext } from 'providers/App/App';
import { WaterfallAggregationResponse } from 'types/api/trace/getTraceV3';

import {
	setTraceStoreAggregations,
	setTraceStoreCallbacks,
	setTraceStoreUserPreferences,
} from './traceStore';

interface TraceStoreSyncProps {
	aggregations: WaterfallAggregationResponse[] | undefined;
	children: ReactNode;
}

/**
 * Bridges React-managed inputs (the `aggregations` prop, `userPreferences`
 * from AppContext, and the user-pref mutation hook) into the Zustand store.
 *
 * Renders nothing until `userPreferences` resolves so the flamegraph never
 * paints with the default colour first and then swaps to the user's
 * persisted choice. AppProvider fires the prefs query as soon as the user
 * is logged in, so this gate is usually already settled by mount time.
 */
function TraceStoreSync({
	aggregations,
	children,
}: TraceStoreSyncProps): JSX.Element | null {
	const { userPreferences, updateUserPreferenceInContext } = useAppContext();
	const { mutate: mutateUserPreference } = useMutation(updateUserPreferenceAPI);

	useEffect(() => {
		setTraceStoreAggregations(aggregations);
	}, [aggregations]);

	useEffect(() => {
		setTraceStoreUserPreferences(userPreferences ?? null);
	}, [userPreferences]);

	useEffect(() => {
		setTraceStoreCallbacks({
			updateUserPreferenceInContext,
			mutateUserPreference,
		});
	}, [updateUserPreferenceInContext, mutateUserPreference]);

	if (!userPreferences) {
		return null;
	}

	return <>{children}</>;
}

export default TraceStoreSync;
