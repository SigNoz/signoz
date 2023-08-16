import axios from 'api';
import { DeleteViewPayloadProps } from 'types/api/saveViews/types';

export const deleteView = async (
	uuid: string,
): Promise<DeleteViewPayloadProps> => axios.delete(`explorer/views/${uuid}`);
