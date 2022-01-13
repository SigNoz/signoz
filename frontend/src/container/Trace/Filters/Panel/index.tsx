import React, { useEffect, useState } from 'react';

import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import { connect, useSelector } from 'react-redux';
import { AppState } from 'store/reducers';

import PanelHeading from './PanelHeading';
import PanelBody from './PanelBody';
import { ThunkDispatch } from 'redux-thunk';
import AppActions from 'types/actions';
import { bindActionCreators } from 'redux';
import { ExpandPanel } from 'store/actions/trace/expandPanel';

const Panel = (props: PanelProps) => {
	const { filter } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const isDefaultOpen = filter.get(props.name);

	const [isOpen, setIsOpen] = useState<boolean>(isDefaultOpen !== undefined);

	useEffect(() => {
		if (isDefaultOpen) {
			setIsOpen(true);
		}
	}, [isDefaultOpen]);

	const onClearHandler = (clearItem: TraceFilterEnum) => {
		console.log(clearItem);
	};

	const onExpandHandler = (props: TraceFilterEnum) => {
		setIsOpen((state) => !state);
	};

	return (
		<>
			<PanelHeading
				name={props.name}
				isOpen={isOpen}
				onExpandHandler={onExpandHandler}
				onClearAllHandler={onClearHandler}
			/>

			{isOpen && <PanelBody type={props.name} />}
		</>
	);
};

interface PanelProps {
	name: TraceFilterEnum;
}

interface DispatchProps {
	expandPanel: (props: TraceFilterEnum) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	expandPanel: bindActionCreators(ExpandPanel, dispatch),
});

export default connect(null, mapDispatchToProps)(Panel);
