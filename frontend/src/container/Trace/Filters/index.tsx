import { AllTraceFilterEnum } from 'types/reducer/trace';

import Panel from './Panel';

function Filters(): JSX.Element {
	return (
		<>
			{AllTraceFilterEnum.map((panelName) => (
				<Panel key={panelName} name={panelName} />
			))}
		</>
	);
}

export default Filters;
