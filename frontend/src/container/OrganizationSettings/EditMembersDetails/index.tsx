import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Tooltip } from 'antd';
import getResetPasswordToken from 'api/user/getResetPasswordToken';
import ROUTES from 'constants/routes';
import { useNotifications } from 'hooks/useNotifications';
import {
	ChangeEventHandler,
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useCopyToClipboard } from 'react-use';
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
	id,
}: EditMembersDetailsProps): JSX.Element {
	const [passwordLink, setPasswordLink] = useState<string>('');

	const { t } = useTranslation(['common']);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [state, copyToClipboard] = useCopyToClipboard();

	const getPasswordLink = (token: string): string =>
		`${window.location.origin}${ROUTES.PASSWORD_RESET}?token=${token}`;

	const onChangeHandler = useCallback(
		(setFunc: Dispatch<SetStateAction<string>>, value: string) => {
			setFunc(value);
		},
		[],
	);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (state.error) {
			notifications.error({
				message: t('something_went_wrong'),
			});
		}

		if (state.value) {
			notifications.success({
				message: t('success'),
			});
		}
	}, [state.error, state.value, t, notifications]);

	const onPasswordChangeHandler: ChangeEventHandler<HTMLInputElement> = useCallback(
		(event) => {
			setPasswordLink(event.target.value);
		},
		[],
	);

	const onGeneratePasswordHandler = async (): Promise<void> => {
		try {
			setIsLoading(true);
			const response = await getResetPasswordToken({
				userId: id || '',
			});

			if (response.statusCode === 200) {
				setPasswordLink(getPasswordLink(response.payload.token));
			} else {
				notifications.error({
					message:
						response.error ||
						t('something_went_wrong', {
							ns: 'common',
						}),
				});
			}
			setIsLoading(false);
		} catch (error) {
			setIsLoading(false);

			notifications.error({
				message: t('something_went_wrong', {
					ns: 'common',
				}),
			});
		}
	};

	return (
		<Space direction="vertical" size="large">
			<Space direction="horizontal">
				<Title>Email address</Title>
				<Input
					placeholder="john@signoz.io"
					readOnly
					onChange={(event): void =>
						onChangeHandler(setEmailAddress, event.target.value)
					}
					disabled={isLoading}
					value={emailAddress}
				/>
			</Space>
			<Space direction="horizontal">
				<Title>Name (optional)</Title>
				<Input
					placeholder="John"
					onChange={(event): void => onChangeHandler(setName, event.target.value)}
					value={name}
					disabled={isLoading}
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
					disabled={isLoading}
				>
					<Option value="ADMIN">ADMIN</Option>
					<Option value="VIEWER">VIEWER</Option>
					<Option value="EDITOR">EDITOR</Option>
				</SelectDrawer>
			</Space>

			<Button
				loading={isLoading}
				disabled={isLoading}
				onClick={onGeneratePasswordHandler}
				type="primary"
			>
				Generate Reset Password link
			</Button>
			{passwordLink && (
				<InputGroup>
					<Input
						style={{ width: '100%' }}
						defaultValue="git@github.com:ant-design/ant-design.git"
						onChange={onPasswordChangeHandler}
						value={passwordLink}
						disabled={isLoading}
					/>
					<Tooltip title="COPY LINK">
						<Button
							icon={<CopyOutlined />}
							onClick={(): void => copyToClipboard(passwordLink)}
						/>
					</Tooltip>
				</InputGroup>
			)}
		</Space>
	);
}

interface EditMembersDetailsProps {
	emailAddress: string;
	name: string;
	role: ROLES;
	setEmailAddress: Dispatch<SetStateAction<string>>;
	setName: Dispatch<SetStateAction<string>>;
	setRole: Dispatch<SetStateAction<ROLES>>;
	id: string;
}

export default EditMembersDetails;
