/* eslint-disable react/jsx-no-comment-textnodes */
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Input } from 'antd';
import Spinner from 'components/Spinner';
import { themeColors } from 'constants/theme';
import { useSetApDexSettings } from 'hooks/apDex/useSetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';
import { useState } from 'react';

import { APPLICATION_SETTINGS } from '../constants';
import {
	AppDexThresholdContainer,
	Button,
	SaveAndCancelContainer,
	SaveButton,
	Typography,
} from '../styles';
import { onSaveApDexSettings } from '../utils';
import { ApDexSettingsProps } from './types';

function ApDexSettings({
	servicename,
	handlePopOverClose,
	isLoading,
	data,
	refetchGetApDexSetting,
}: ApDexSettingsProps): JSX.Element {
	const [thresholdValue, setThresholdValue] = useState(() => {
		if (data) {
			return data.data[0].threshold;
		}
		return 0;
	});
	const { notifications } = useNotifications();

	const { isLoading: setApDexIsLoading, mutateAsync } = useSetApDexSettings({
		servicename,
		threshold: thresholdValue,
		excludeStatusCode: '',
	});

	const handleThreadholdChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	): void => {
		setThresholdValue(Number(e.target.value));
	};

	if (isLoading) {
		return (
			<Typography.Text style={{ color: themeColors.white }}>
				<Spinner height="5vh" tip="Loading..." />
			</Typography.Text>
		);
	}

	return (
		<Card
			title={APPLICATION_SETTINGS}
			extra={<CloseOutlined width={10} height={10} onClick={handlePopOverClose} />}
			actions={[
				<SaveAndCancelContainer key="SaveAndCancelContainer">
					<Button onClick={handlePopOverClose}>Cancel</Button>
					<SaveButton
						onClick={onSaveApDexSettings({
							handlePopOverClose,
							mutateAsync,
							notifications,
							refetchGetApDexSetting,
							servicename,
							thresholdValue,
						})}
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
					Apdex threshold (in seconds){' '}
					<Typography.Link>
						<QuestionCircleOutlined />
					</Typography.Link>
				</Typography>
				<Input
					type="number"
					value={thresholdValue}
					onChange={handleThreadholdChange}
					min={0}
				/>
			</AppDexThresholdContainer>
			{/* TODO: Add this feature later when backend is ready to support it. */}
			{/* <ExcludeErrorCodeContainer>
				<Typography.Text>
					Exclude following error codes from error rate calculation
				</Typography.Text>
				<Input placeholder="e.g. 406, 418" />
			</ExcludeErrorCodeContainer> */}
		</Card>
	);
}

ApDexSettings.defaultProps = {
	isLoading: undefined,
	data: undefined,
	refetchGetApDexSetting: undefined,
};

export default ApDexSettings;
