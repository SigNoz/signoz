import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, notification, Select, Space, Tooltip } from 'antd';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROLES } from 'types/roles';

import { InputGroup, SelectDrawer, Title } from './styles';

const { Option } = Select;

function EditMembersDetails({
	emailAddress,
	name,
	role,
	setEmailAddress,
	setName,
	setRole,
}: EditMembersDetailsProps): JSX.Element {
	const [passwordLink, setPasswordLink] = useState<string>('');
	const { t } = useTranslation(['common']);

	const onChangeHandler = useCallback(
		(setFunc: React.Dispatch<React.SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const onPasswordChangeHandler = useCallback((event) => {
		setPasswordLink(event.target.value);
	}, []);

	const onPasswordCopiedHandler = async (): Promise<void> => {
		try {
			await navigator.clipboard.writeText(passwordLink);
			notification.success({
				message: t('success'),
			});
		} catch (error) {
			notification.error({
				message: t('something_went_wrong'),
			});
		}
	};

	return (
		<Space direction="vertical" size="large">
			<Space direction="horizontal">
				<Title>Email address</Title>
				<Input
					placeholder="john@signoz.io"
					onChange={(event): void =>
						onChangeHandler(setEmailAddress, event.target.value)
					}
					value={emailAddress}
				/>
			</Space>
			<Space direction="horizontal">
				<Title>Name (optional)</Title>
				<Input
					placeholder="John"
					onChange={(event): void => onChangeHandler(setName, event.target.value)}
					value={name}
				/>
			</Space>
			<Space direction="horizontal">
				<Title>Role</Title>
				<SelectDrawer
					value={role}
					onSelect={(value: unknown): void => {
						if (typeof value === 'string') {
							setRole(value as ROLES);
						}
					}}
				>
					<Option value="ADMIN">ADMIN</Option>
					<Option value="VIEWER">VIEWER</Option>
					<Option value="EDITOR">EDITOR</Option>
				</SelectDrawer>
			</Space>

			<Button type="primary">Generate Reset Password link</Button>
			<InputGroup>
				<Input
					style={{ width: '100%' }}
					defaultValue="git@github.com:ant-design/ant-design.git"
					onChange={onPasswordChangeHandler}
					value={passwordLink}
				/>
				<Tooltip title="COPY LINK">
					<Button icon={<CopyOutlined />} onClick={onPasswordCopiedHandler} />
				</Tooltip>
			</InputGroup>
		</Space>
	);
}

interface EditMembersDetailsProps {
	emailAddress: string;
	name: string;
	role: ROLES;
	setEmailAddress: React.Dispatch<React.SetStateAction<string>>;
	setName: React.Dispatch<React.SetStateAction<string>>;
	setRole: React.Dispatch<React.SetStateAction<ROLES>>;
}

export default EditMembersDetails;
