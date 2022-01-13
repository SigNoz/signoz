import React, { useEffect, useState } from 'react';

import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';

import PanelHeading from './PanelHeading';
import PanelBody from './PanelBody';

const Panel = (props: PanelProps) => {
	const { filter } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	const isDefaultOpen = filter.get(props.name);

	const [isOpen, setIsOpen] = useState<boolean>(isDefaultOpen !== undefined);

	useEffect(() => {
		if (filter.get(props.name)) {
			setIsOpen(true);
		}
	}, [filter]);

	const onClearHandler = (clearItem: TraceFilterEnum) => {
		console.log(clearItem);
	};

	const onExpandHandler = (props: TraceFilterEnum) => {
		setIsOpen((state) => !state);
		console.log(props);
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

export default Panel;
