import { Dispatch } from 'redux';
import AppActions from 'types/actions';
import { QuerySuccessPayload } from 'types/actions/dashboard';

export const QuerySuccess = (
	props: QuerySuccessPayload,
): ((dispatch: Dispatch<AppActions>) => void) => {
	return (dispatch: Dispatch<AppActions>): void => {
		dispatch({
			type: 'QUERY_SUCCESS',
			payload: {
				...props,
			},
		});
	};
};

export type QuerySuccessProps = QuerySuccessPayload;
