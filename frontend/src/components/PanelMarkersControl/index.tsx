import './PanelMarkersControl.scss';

import { Skeleton, Switch, Typography } from 'antd';
import CustomMultiSelect from 'components/NewSelect/CustomMultiSelect';
import { MARKER_TYPES } from 'components/PanelMarkersControl/constants';
import useMarkerControlState, {
	MARKER_ACTIONS,
} from 'components/PanelMarkersControl/hooks/useMarkerControlState';
import useMarkerHandlers from 'components/PanelMarkersControl/hooks/useMarkerHandlers';
import {
	getInitialStateForControls,
	getQueryParamsFromState,
} from 'components/PanelMarkersControl/utils';
import useUrlQuery from 'hooks/useUrlQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useFetchMarkersData, useMarkers } from 'providers/Markers/Markers';
import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

function PanelMarkersControl(): JSX.Element {
	const urlQuery = useUrlQuery();
	const { search } = useLocation();
	const history = useHistory();

	const { selectedDashboard } = useDashboard();

	const { store: markerControlState, dispatch } = useMarkerControlState(
		getInitialStateForControls(selectedDashboard?.id || '', urlQuery),
	);

	const { markersData, setMarkersData } = useMarkers();

	const { loadingMarkers } = useFetchMarkersData({
		isFetchEnabled: markerControlState.showMarkers === 1,
	});

	const { onMarkerToggleOn, onMarkerToggleOff } = useMarkerHandlers({
		key: selectedDashboard?.id || '',
	});

	// API integration: check if this is correct
	const markerTypeOptions = useMemo(() => {
		const uniqueTypes = Array.from(
			new Set((markersData || []).map((m: any) => m?.type).filter(Boolean)),
		);
		return uniqueTypes.map((t: string) => ({
			label: t.charAt(0).toUpperCase() + t.slice(1),
			value: t,
		}));
	}, [markersData]);

	// API integration: check if this is correct
	const serviceNameOptions = useMemo(() => {
		const uniqueServices = Array.from(
			new Set(
				(markersData || [])
					.map((m: any) => m?.attr?.['service.name'])
					.filter(Boolean),
			),
		);
		return uniqueServices.map((s: string) => ({ label: s, value: s }));
	}, [markersData]);

	const handleServiceChange = useCallback(
		(serviceOrServices: string | string[] | undefined): void => {
			let servicesArray: string[] = [];
			if (Array.isArray(serviceOrServices)) {
				servicesArray = serviceOrServices;
			} else if (serviceOrServices) {
				servicesArray = [serviceOrServices];
			}
			dispatch({
				type: MARKER_ACTIONS.SET_MARKER_SERVICES,
				payload: servicesArray,
			});

			// sync URL param
			const params = new URLSearchParams(search);
			if (servicesArray.length > 0) {
				params.set('markerServices', servicesArray.join(','));
			} else {
				params.delete('markerServices');
			}
			history.replace({ search: params.toString() });
		},
		[history, search, dispatch],
	);

	const handleMarkerTypesChange = useCallback(
		(typesOrArray: string | string[] | undefined): void => {
			let typesArray: string[] = [];
			if (Array.isArray(typesOrArray)) {
				typesArray = typesOrArray;
			} else if (typesOrArray) {
				typesArray = [typesOrArray];
			}
			dispatch({ type: MARKER_ACTIONS.SET_MARKER_TYPES, payload: typesArray });

			const params = new URLSearchParams(search);
			if (typesArray.length > 0) {
				params.set('markerTypes', typesArray.join(','));
			} else {
				params.delete('markerTypes');
			}
			history.replace({ search: params.toString() });
		},
		[history, search, dispatch],
	);

	const handleToggleShowMarkers = useCallback(
		(checked: boolean): void => {
			dispatch({ type: MARKER_ACTIONS.TOGGLE_SHOW_MARKERS, payload: checked });
			if (checked) {
				// get default services and marker types from markersData
				onMarkerToggleOn();
			} else {
				// consider using useReducer to reset the state
				setMarkersData([]);
				dispatch({ type: MARKER_ACTIONS.RESET });
				onMarkerToggleOff();
			}
		},
		[onMarkerToggleOn, onMarkerToggleOff, dispatch, setMarkersData],
	);

	useEffect(() => {
		if (markersData.length < 1) return;
		/**
		 * On markers data change, derive defaults (or use query selections if present)
		 * and set them in a single reducer dispatch.
		 */
		const queryMarkerServicesRaw = urlQuery.get('markerServices') || '';
		const queryMarkerTypesRaw = urlQuery.get('markerTypes') || '';

		const defMarkerServices = ['cart-service'];
		const defMarkerTypes = [MARKER_TYPES.DEPLOYMENT];

		const servicesArray = queryMarkerServicesRaw
			? queryMarkerServicesRaw
					.split(',')
					.map((s) => s.trim())
					.filter((s) => s.length > 0)
			: defMarkerServices;
		const typesArray = queryMarkerTypesRaw
			? queryMarkerTypesRaw
					.split(',')
					.map((t) => t.trim())
					.filter((t) => t.length > 0)
			: defMarkerTypes;

		dispatch({
			type: MARKER_ACTIONS.SET_DEFAULTS_ON,
			payload: { markerServices: servicesArray, markerTypes: typesArray },
		});

		// reflect in URL params as well
		const params = new URLSearchParams(search);
		const queryParams = getQueryParamsFromState(params, {
			showMarkers: 1,
			markerServices: servicesArray,
			markerTypes: typesArray,
		});
		history.replace({ search: queryParams.toString() });

		console.log('>>> markersData', markersData);
		// urlQuery removed from dependencies as not able to unset markerTypes. But works with markerServices. [CHECK THIS]

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [markersData]);

	// ADD INITIAL STATE FOR SELECTED SERVICES AND MARKER TYPES

	return (
		<div className="panel-markers-control">
			<div className="panel-markers-view-controller">
				<Typography>Show Markers</Typography>
				<Switch
					size="small"
					checked={markerControlState.showMarkers === 1}
					onChange={handleToggleShowMarkers}
				/>
			</div>

			{markerControlState.showMarkers === 1 && (
				<div className="panel-markers-inputs-section">
					{loadingMarkers ? (
						<div className="markers-control-skeleton">
							<Skeleton.Input active size="small" />
							<Skeleton.Input active size="small" />
						</div>
					) : (
						<>
							<div className="panel-markers-select-container">
								<Typography.Text className="variable-name" ellipsis>
									Marker type
								</Typography.Text>
								<CustomMultiSelect
									className="panel-markers-select"
									placeholder="Select one or more marker types"
									enableAllSelection={false}
									options={markerTypeOptions}
									maxTagCount={3}
									value={markerControlState.markerTypes}
									onChange={handleMarkerTypesChange}
								/>
							</div>
							<div className="panel-markers-select-container">
								<Typography.Text className="variable-name" ellipsis>
									Service name
								</Typography.Text>
								<CustomMultiSelect
									className="panel-markers-select"
									placeholder="Select one or more service names"
									maxTagCount={3}
									enableAllSelection={false}
									options={serviceNameOptions}
									value={markerControlState.markerServices}
									onChange={handleServiceChange}
								/>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

// select bright color for the markers
// convert panel marker state to useReducer
// removed urlQuery from dependencies.
// filters on markersData should work properly. If no markers selected. Show no markers.

export default PanelMarkersControl;
