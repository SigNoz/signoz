import { GoogleSquareFilled, KeyOutlined } from '@ant-design/icons';
import { Space, Typography } from 'antd';
import React, { useCallback } from 'react';

import Row, { RowProps } from './Row';
import { RowContainer } from './styles';

function Create({
	setIsSettingsOpen,
	setIsEditModalOpen,
}: CreateProps): JSX.Element {
	const onConfigureClickHandler = useCallback(() => {
		console.log('Configure Clicked');
	}, []);

	const onEditSAMLHandler = useCallback(() => {
		setIsSettingsOpen(false);
		setIsEditModalOpen(true);
	}, [setIsSettingsOpen, setIsEditModalOpen]);

	const data: RowProps[] = [
		{
			buttonText: 'Configure',
			Icon: <GoogleSquareFilled style={{ fontSize: '37px' }} />,
			title: 'Google Apps Authentication',
			subTitle: 'Let members sign-in with a Google account',
			onClickHandler: onConfigureClickHandler,
			isDisabled: true,
		},
		{
			buttonText: 'Edit SAML',
			Icon: <KeyOutlined style={{ fontSize: '37px' }} />,
			onClickHandler: onEditSAMLHandler,
			subTitle: 'Azure, Active Directory, Okta or your custom SAML 2.0 solution',
			title: 'SAML Authentication',
			isDisabled: false,
		},
	];

	return (
		<div>
			<Typography.Text italic>
				SigNoz supports the following single sign-on services (SSO). Get started
				with setting your project’s SSO below
			</Typography.Text>

			<RowContainer>
				<Space direction="vertical">
					{data.map((rowData) => (
						<Row
							Icon={rowData.Icon}
							buttonText={rowData.buttonText}
							onClickHandler={rowData.onClickHandler}
							subTitle={rowData.subTitle}
							title={rowData.title}
							key={rowData.title}
							isDisabled={rowData.isDisabled}
						/>
					))}
				</Space>
			</RowContainer>
		</div>
	);
}

interface CreateProps {
	setIsSettingsOpen: (value: boolean) => void;
	setIsEditModalOpen: (value: boolean) => void;
}

export default Create;
