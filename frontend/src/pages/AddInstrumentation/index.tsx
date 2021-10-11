import { Typography } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import AppReducer from 'types/reducer/app';

import { Container, Heading } from './styles';

const InstrumentationPage = (): JSX.Element => {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	return (
		<>
			<Heading>Instrument your application</Heading>
			<Container isDarkMode={isDarkMode}>
				<Typography>Congrats, you have successfully installed SigNoz!</Typography>{' '}
				<Typography>
					To start seeing YOUR application data here, follow the instructions in the
					docs -
				</Typography>
				<a
					href={'https://signoz.io/docs/instrumentation/overview'}
					target="_blank"
					rel="noreferrer"
				>
					https://signoz.io/docs/instrumentation/overview
				</a>
				&nbsp;If you face any issues, join our
				<a
					href={
						'https://signoz-community.slack.com/join/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA'
					}
					target="_blank"
					rel="noreferrer"
				>
					&nbsp;slack community&nbsp;
				</a>
				to ask any questions or mail us at&nbsp;
				<a href={'mailto:support@signoz.io'} target="_blank" rel="noreferrer">
					support@signoz.io
				</a>
			</Container>
		</>
	);
};

export default InstrumentationPage;
