import './Slider.styles.scss';

import { IQuickFiltersConfig } from 'components/QuickFilters/types';

interface ISliderProps {
	filter: IQuickFiltersConfig;
}

// not needed for now build when required
export default function Slider(props: ISliderProps): JSX.Element {
	const { filter } = props;
	console.log(filter);
	return <div>Slider</div>;
}
