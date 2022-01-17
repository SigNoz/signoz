import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ClearAllFilter } from 'store/actions/trace/clearAllFilter';
import { ExpandPanel } from 'store/actions/trace/expandPanel';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import PanelBody from './PanelBody';
import PanelHeading from './PanelHeading';

const Panel = (props: PanelProps): JSX.Element => {
	const { filterToFetchData } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const isDefaultOpen =
		filterToFetchData.find((e) => e === props.name) !== undefined;

	const onClearHandler = (clearItem: TraceFilterEnum) => {
		props.clearAllFilter(clearItem);
	};

	const onExpandHandler = (exp: TraceFilterEnum) => {
		props.expandPanel(exp, !isDefaultOpen);
	};

	return (
		<>
			<PanelHeading
				name={props.name}
				isOpen={isDefaultOpen}
				onExpandHandler={onExpandHandler}
				onClearAllHandler={onClearHandler}
			/>

			{isDefaultOpen && <PanelBody type={props.name} />}
		</>
	);
};

interface DispatchProps {
	expandPanel: (props: TraceFilterEnum, isOpen: boolean) => void;
	clearAllFilter: (props: TraceFilterEnum) => void;
}

interface PanelProps extends DispatchProps {
	name: TraceFilterEnum;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	expandPanel: bindActionCreators(ExpandPanel, dispatch),
	clearAllFilter: bindActionCreators(ClearAllFilter, dispatch),
});

export default connect(null, mapDispatchToProps)(Panel);
