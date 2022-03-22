import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import PanelBody from './PanelBody';
import PanelHeading from './PanelHeading';

function Panel(props: PanelProps): JSX.Element {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const isDefaultOpen =
		traces.filterToFetchData.find((e) => e === props.name) !== undefined;

	return (
		<>
			<PanelHeading name={props.name} isOpen={isDefaultOpen} />

			{isDefaultOpen && <PanelBody type={props.name} />}
		</>
	);
}

interface PanelProps {
	name: TraceFilterEnum;
}

export default Panel;
