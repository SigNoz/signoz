import { SignalType } from 'components/QuickFilters/types';

interface FilterType {
	key: string;
	datatype: string;
	type: string;
}

export interface UpdateCustomFiltersProps {
	data: {
		filters: FilterType[];
		signal: SignalType;
	};
}
