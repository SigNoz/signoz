import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ExpandPanel } from 'store/actions/trace/expandPanel';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import PanelBody from './PanelBody';
import PanelHeading from './PanelHeading';

const Panel = (props: PanelProps): JSX.Element => {
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

	const onExpandHandler = (exp: TraceFilterEnum) => {
		setIsOpen((state) => !state);
		props.expandPanel(exp)
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


interface DispatchProps {
	expandPanel: (props: TraceFilterEnum) => void;
}

interface PanelProps extends DispatchProps {
	name: TraceFilterEnum;
}


const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	expandPanel: bindActionCreators(ExpandPanel, dispatch),
});

export default connect(null, mapDispatchToProps)(Panel);
