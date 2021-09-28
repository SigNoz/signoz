import { Space } from 'antd';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import styled from 'styled-components';
import AppReducer from 'types/reducer/app';

const InstrumentCard = styled.div<{
	isDarkMode: boolean;
}>`
	border-radius: 4px;
	background: ${({ isDarkMode }): string => (isDarkMode ? '#313131' : '#ddd')};
	padding: 33px 23px;
	max-width: 800px;
	margin-top: 40px;
`;

const InstrumentationPage = (): JSX.Element => {
	const { isDarkMode } = useSelector<AppState, AppReducer>((state) => state.app);

	return (
		<React.Fragment>
			<Space style={{ marginLeft: 60, marginTop: 48, display: 'block' }}>
				<div>
					<h2>Instrument your application</h2>
				</div>
				<InstrumentCard isDarkMode={isDarkMode}>
					Congrats, you have successfully installed SigNoz!
					<br />
					To start seeing YOUR application data here, follow the instructions in the
					docs -
					<a
						href={'https://signoz.io/docs/instrumentation/overview'}
						target="_blank"
						rel="noreferrer"
					>
						{' '}
						https://signoz.io/docs/instrumentation/overview
					</a>
					<br />
					If you face any issues, join our{' '}
					<a
						href={
							'https://signoz-community.slack.com/join/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA'
						}
						target="_blank"
						rel="noreferrer"
					>
						slack community
					</a>{' '}
					to ask any questions or mail us at{' '}
					<a href={'mailto:support@signoz.io'} target="_blank" rel="noreferrer">
						support@signoz.io
					</a>
				</InstrumentCard>
			</Space>
		</React.Fragment>
	);
};

export default InstrumentationPage;
