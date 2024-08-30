import './Slider.styles.scss';

import {
	FiltersType,
	IQuickFiltersConfig,
	MinMax,
} from 'components/QuickFilters/QuickFilters';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';

interface ISliderProps {
	filter: IQuickFiltersConfig;
	onChange: (
		attributeKey: BaseAutocompleteData,
		value: string,
		type: FiltersType,
		selected: boolean,
		minMax?: MinMax,
	) => void;
}

// not needed for now build when required
export default function Slider(props: ISliderProps): JSX.Element {
	const { filter, onChange } = props;
	console.log(filter, onChange);
	return <div>Slider</div>;
}
