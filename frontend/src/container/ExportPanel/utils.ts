import { ComboboxSimpleItem } from '@signozhq/ui/combobox';
import { Dashboard } from 'types/api/dashboard/getAll';

export const getSelectOptions = (data: Dashboard[]): ComboboxSimpleItem[] =>
	data.map(({ id, data }) => ({
		label: data.title,
		value: id,
	}));
