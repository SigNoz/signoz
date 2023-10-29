import isEqual from 'lodash-es/isEqual';
import { useEffect, useRef } from 'react';
import UPlot from 'uplot';

export interface UplotProps {
	data: uPlot.AlignedData;
	options: uPlot.Options;
}

export default function Uplot(props: UplotProps): JSX.Element {
	const plotRef = useRef<HTMLDivElement | null>(null);
	const plot = useRef<uPlot | undefined>(undefined);

	const createPlot = (): void => {
		const { data, options } = props;
		if (plotRef.current) {
			plot.current = new UPlot(options, data, plotRef.current);
		}
	};

	useEffect(() => {
		createPlot();
		return (): void => {
			plot.current?.destroy();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		const { data, options } = props;

		if (plot.current) {
			if (!isEqual(options, plot.current.opts)) {
				plot.current?.destroy();
				createPlot();
			} else if (!isEqual(data, plot.current.data)) {
				plot.current?.setData(data);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props]);

	return <div ref={plotRef} />;
}
