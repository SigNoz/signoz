import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Input } from 'antd';
import axios, { AxiosResponse } from 'axios';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { themeColors } from 'constants/theme';
import { useSetApDexSettings } from 'hooks/apDex/useSetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { useEffect, useState } from 'react';
import { ApDexPayloadProps } from 'types/api/metrics/getApDex';

import {
	AppDexThresholdContainer,
	Button,
	ExcludeErrorCodeContainer,
	SaveAndCancelContainer,
	SaveButton,
	Typography,
} from '../styles';

function ApDexSettings({
	servicename,
	handlePopOverClose,
	isLoading,
	data,
	refetch,
}: ApDexSettingsProps): JSX.Element {
	const [threadholdValue, setThreadholdValue] = useState(0);
	const { notifications } = useNotifications();

	const { isLoading: setApDexIsLoading, mutateAsync } = useSetApDexSettings({
		servicename,
		threshold: threadholdValue || 0,
		excludeStatusCode: '',
	});

	useEffect(() => {
		if (data) {
			setThreadholdValue(data.data[0].threshold);
		}
	}, [data]);

	const handleThreadholdChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setThreadholdValue(Number(e.target.value));
	};

	const onSaveHandler = (): void => {
		if (threadholdValue && refetch) {
			mutateAsync({
				servicename,
				threshold: threadholdValue,
				excludeStatusCode: '',
			})
				.then(() => {
					refetch();
				})
				.catch((err) => {
					if (axios.isAxiosError(err)) {
						notifications.error({
							message: err.message,
						});
					} else {
						notifications.error({
							message: SOMETHING_WENT_WRONG,
						});
					}
				})
				.finally(() => {
					handlePopOverClose();
				});
		} else {
			notifications.error({
				message: 'Please enter a valid value',
			});
		}
	};

	if (isLoading) {
		return (
			<Typography.Text style={{ color: themeColors.white }}>
				<Spinner height="5vh" />
			</Typography.Text>
		);
	}

	return (
		<Card
			title="Application Settings"
			extra={<CloseOutlined width={10} height={10} onClick={handlePopOverClose} />}
			actions={[
				<SaveAndCancelContainer key="SaveAndCancelContainer">
					<Button onClick={handlePopOverClose}>Cancel</Button>
					<SaveButton
						onClick={onSaveHandler}
						type="primary"
						loading={setApDexIsLoading}
					>
						Save
					</SaveButton>
				</SaveAndCancelContainer>,
			]}
		>
			<AppDexThresholdContainer>
				<Typography>
					AppDex Threshold{' '}
					<Typography.Link>
						<QuestionCircleOutlined />
					</Typography.Link>
				</Typography>
				<Input
					type="number"
					value={threadholdValue}
					onChange={handleThreadholdChange}
					max={1}
					min={0}
				/>
			</AppDexThresholdContainer>
			<ExcludeErrorCodeContainer>
				<Typography.Text>
					Exclude following error codes from error rate calculation
				</Typography.Text>
				<Input placeholder="e.g. 406, 418" />
			</ExcludeErrorCodeContainer>
		</Card>
	);
}

interface ApDexSettingsProps {
	servicename: string;
	handlePopOverClose: () => void;
	isLoading?: boolean;
	data?: AxiosResponse<ApDexPayloadProps[]> | undefined;
	refetch?: () => void;
}

ApDexSettings.defaultProps = {
	isLoading: undefined,
	data: undefined,
	refetch: undefined,
};

export default ApDexSettings;
