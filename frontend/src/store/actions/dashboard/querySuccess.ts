import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { QueryData } from 'types/api/widgets/getQuery';

export const QuerySuccess = ({
	data,
}: QuerySuccessProps): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'QUERY_SUCCESS',
			payload: {
				data: data,
			},
		});
	};
};

export interface QuerySuccessProps {
	data: QueryData[];
}
