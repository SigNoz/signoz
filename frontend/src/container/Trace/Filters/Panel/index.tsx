import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import PanelBody from './PanelBody';
import PanelHeading from './PanelHeading';

function Panel(props: PanelProps): JSX.Element {
	const traces = useSelector<AppState, TraceReducer>((state) => state.traces);

	const { name } = props;

	const isDefaultOpen =
		traces.filterToFetchData.find((e) => e === name) !== undefined;

	return (
		<>
			<PanelHeading name={name} isOpen={isDefaultOpen} />

			{isDefaultOpen && <PanelBody type={name} />}
		</>
	);
}

interface PanelProps {
	name: TraceFilterEnum;
}

export default Panel;
