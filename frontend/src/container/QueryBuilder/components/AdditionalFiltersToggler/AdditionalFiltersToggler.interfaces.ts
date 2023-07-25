import { ReactNode } from 'react';

export type AdditionalFiltersProps = {
	listOfAdditionalFilter: string[];
	hideLimit?: boolean;
	children: ReactNode;
	queryname? : string;
};
