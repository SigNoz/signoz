import { PayloadProps as DeletePayloadProps } from './delete';
import { Alerts } from './getAll';

export type PayloadProps = DeletePayloadProps;

export interface Props {
	id: Alerts['id'];
	data: DeletePayloadProps['data'];
}
