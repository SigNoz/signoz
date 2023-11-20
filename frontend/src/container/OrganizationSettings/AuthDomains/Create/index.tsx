import { GoogleSquareFilled, KeyOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { useCallback, useMemo } from 'react';
import { AuthDomain, GOOGLE_AUTH, SAML } from 'types/api/SAML/listDomain';

import Row, { RowProps } from './Row';
import { RowContainer, RowSpace } from './styles';

function Create({
	ssoMethod,
	assignSsoMethod,
	setIsSettingsOpen,
	setIsEditModalOpen,
}: CreateProps): JSX.Element {
	const onGoogleAuthClickHandler = useCallback(() => {
		assignSsoMethod(GOOGLE_AUTH);
		setIsSettingsOpen(false);
		setIsEditModalOpen(true);
	}, [assignSsoMethod, setIsSettingsOpen, setIsEditModalOpen]);

	const onEditSAMLHandler = useCallback(() => {
		assignSsoMethod(SAML);
		setIsSettingsOpen(false);
		setIsEditModalOpen(true);
	}, [assignSsoMethod, setIsSettingsOpen, setIsEditModalOpen]);

	const ConfigureButtonText = useMemo(() => {
		switch (ssoMethod) {
			case GOOGLE_AUTH:
				return 'Edit Google Auth';
			case SAML:
				return 'Edit SAML';
			default:
				return 'Get Started';
		}
	}, [ssoMethod]);

	const data: RowProps[] = [
		{
			buttonText: ConfigureButtonText,
			Icon: <GoogleSquareFilled style={{ fontSize: '37px' }} />,
			title: 'Google Apps Authentication',
			subTitle: 'Let members sign-in with a Google account',
			onClickHandler: onGoogleAuthClickHandler,
			isDisabled: false,
		},
		{
			buttonText: ConfigureButtonText,
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
				<RowSpace direction="vertical">
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
				</RowSpace>
			</RowContainer>
		</div>
	);
}

interface CreateProps {
	ssoMethod: AuthDomain['ssoType'];
	assignSsoMethod: (value: AuthDomain['ssoType']) => void;
	setIsSettingsOpen: (value: boolean) => void;
	setIsEditModalOpen: (value: boolean) => void;
}

export default Create;
