import { IDashboardVariable } from 'types/api/dashboard/getAll';

export type Props = {
	query: string;
	variables: Record<string, IDashboardVariable>;
};

export type PayloadProps = {
	variableValues: string[] | number[];
};
