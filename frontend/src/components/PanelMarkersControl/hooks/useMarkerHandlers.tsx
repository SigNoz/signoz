import {
	clearLocalStorageState,
	getLocalStorageState,
	getMarkerStateFromQuery,
	getQueryParamsFromState,
	setLocalStorageState,
} from 'components/PanelMarkersControl/utils';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

type MarkerHandlers = {
	onMarkerToggleOn: () => void;
	onMarkerToggleOff: () => void;
};

const useMarkerHandlers = ({ key }: { key: string }): MarkerHandlers => {
	const urlQuery = useUrlQuery();
	const { search } = useLocation();
	const history = useHistory();

	// useEffect to sync url query with local storage
	useEffect(() => {
		const queryState = getMarkerStateFromQuery(urlQuery);
		const localStorageState = getLocalStorageState(key);

		if (queryState === null && localStorageState?.showMarkers) {
			const params = new URLSearchParams(search);
			const queryParams = getQueryParamsFromState(params, localStorageState);
			history.replace({ search: queryParams.toString() });
		} else {
			setLocalStorageState(key, queryState);
		}
	}, [urlQuery, key, search, history]);

	const onMarkerToggleOn = useCallback(() => {
		// set defaults for service and marker type
		const params = new URLSearchParams(search);
		params.set('showMarkers', '1');
		history.replace({ search: params.toString() });
	}, [search, history]);

	const onMarkerToggleOff = useCallback(() => {
		// important to clear both  url query and local storage here. Else url local storage sync useEffect will not work as expected.
		clearLocalStorageState(key);

		const params = new URLSearchParams(search);
		params.delete('showMarkers');
		params.delete('markerServices');
		params.delete('markerTypes');
		history.replace({ search: params.toString() });
	}, [key, search, history]);

	return { onMarkerToggleOn, onMarkerToggleOff };
};

export default useMarkerHandlers;
