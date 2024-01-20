import { ToggleGraphProps } from 'components/Graph/types';
import { getGraphVisibilityStateOnDataChange } from 'container/GridCardLayout/GridCard/utils';
import {
	Dispatch,
	MutableRefObject,
	SetStateAction,
	useEffect,
	useState,
} from 'react';
import uPlot from 'uplot';

type UseGraphVisibilityState = {
	(props: {
		options: uPlot.Options;
		isExpandedName: boolean;
		name: string;
		lineChartRef: MutableRefObject<ToggleGraphProps | undefined>;
	}): {
		graphsVisibilityStates: boolean[];
		setGraphsVisibilityStates: Dispatch<SetStateAction<boolean[]>>;
	};
};

export const useGraphVisibilityState: UseGraphVisibilityState = ({
	options,
	isExpandedName,
	name,
	lineChartRef,
}) => {
	const {
		graphVisibilityStates: localStoredVisibilityStates,
	} = getGraphVisibilityStateOnDataChange({
		options,
		isExpandedName,
		name,
	});

	const [graphsVisibilityStates, setGraphsVisibilityStates] = useState(
		localStoredVisibilityStates,
	);

	useEffect(() => {
		if (!lineChartRef.current) return;

		if (localStoredVisibilityStates.length > 1) {
			localStoredVisibilityStates.forEach((state, index) => {
				console.log({ index, state });
				lineChartRef.current?.toggleGraph(index, state);
			});
		}
		setGraphsVisibilityStates(localStoredVisibilityStates);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [localStoredVisibilityStates]);

	return { graphsVisibilityStates, setGraphsVisibilityStates };
};
