import { Button, Space } from 'antd';
import setFlags from 'api/user/setFlags';
import MessageTip from 'components/MessageTip';
import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Dispatch } from 'redux';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { UPDATE_USER_FLAG } from 'types/actions/app';
import { UserFlags } from 'types/api/user/setFlags';
import AppReducer from 'types/reducer/app';

import ReleaseNoteProps from '../ReleaseNoteProps';

export default function ReleaseNote0120({
	release,
}: ReleaseNoteProps): JSX.Element | null {
	const { user } = useSelector<AppState, AppReducer>((state) => state.app);

	const dispatch = useDispatch<Dispatch<AppActions>>();

	const handleDontShow = useCallback(async (): Promise<void> => {
		const flags: UserFlags = { ReleaseNote0120Hide: 'Y' };

		try {
			dispatch({
				type: UPDATE_USER_FLAG,
				payload: {
					flags,
				},
			});
			if (!user) {
				// no user is set, so escape the routine
				return;
			}

			const response = await setFlags({ userId: user?.userId, flags });

			if (response.statusCode !== 200) {
				console.log('failed to complete do not show status', response.error);
			}
		} catch (e) {
			// here we do not nothing as the cost of error is minor,
			// the user can switch the do no show option again in the further.
			console.log('unexpected error: failed to complete do not show status', e);
		}
	}, [dispatch, user]);

	return (
		<MessageTip
			show
			message={
				<div>
					You are using {release} of SigNoz. We have introduced distributed setup in
					v0.12.0 release. If you use or plan to use clickhouse queries in dashboard
					or alerts, you might want to read about querying the new distributed tables{' '}
					<a
						href="https://signoz.io/docs/operate/migration/upgrade-0.12/#querying-distributed-tables"
						target="_blank"
						rel="noreferrer"
					>
						here
					</a>
				</div>
			}
			action={
				<Space>
					<Button onClick={handleDontShow}>Do not show again</Button>
				</Space>
			}
		/>
	);
}
