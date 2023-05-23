import { IResourceAttribute } from 'hooks/useResourceAttribute/types';

export interface IQueryChipProps {
	queryData: IResourceAttribute;
	onClose: (id: string) => void;
}
