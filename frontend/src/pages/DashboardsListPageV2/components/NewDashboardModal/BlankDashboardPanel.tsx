import { type ChangeEvent, useState } from 'react';
// eslint-disable-next-line signoz/no-antd-components -- no @signozhq/ui multiline TextArea yet
import { Input as AntInput } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import { toast } from '@signozhq/ui/sonner';
import { AxiosError } from 'axios';
import { generatePath } from 'react-router-dom';
import logEvent from 'api/common/logEvent';
import { createDashboardV2 } from 'api/generated/services/dashboard';
import ROUTES from 'constants/routes';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';
import TagKeyValueInput from 'components/TagKeyValueInput/TagKeyValueInput';

import { keyValueStringsToTags } from '../../utils/helpers';

import { DASHBOARD_NAME_MAX_LENGTH } from '../../../DashboardPageV2/DashboardContainer/constants';
import styles from './NewDashboardModal.module.scss';

const DEFAULT_NAME = 'Sample Dashboard';

interface Props {
	onClose: () => void;
}

function BlankDashboardPanel({ onClose }: Props): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const { showErrorModal } = useErrorModal();

	const [name, setName] = useState(DEFAULT_NAME);
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [submitting, setSubmitting] = useState(false);

	const canSubmit = name.trim().length > 0 && !submitting;

	const handleCreate = async (): Promise<void> => {
		if (!canSubmit) {
			return;
		}
		try {
			setSubmitting(true);
			logEvent('Dashboard List: Create dashboard clicked', {});
			const postableTags = keyValueStringsToTags(tags);
			const created = await createDashboardV2({
				schemaVersion: 'v6',
				generateName: true,
				tags: postableTags.length ? postableTags : null,
				spec: {
					display: {
						name: name.trim(),
						description: description.trim() || undefined,
					},
					layouts: [],
					panels: {},
					variables: [],
				},
			});
			onClose();
			safeNavigate(
				generatePath(ROUTES.DASHBOARD, { dashboardId: created.data.id }),
			);
		} catch (e) {
			showErrorModal(e as APIError);
			toast.error((e as AxiosError).toString() || 'Failed to create dashboard');
			setSubmitting(false);
		}
	};

	return (
		<div className={styles.panel}>
			<div className={styles.form}>
				<div className={styles.field}>
					<Typography.Text className={styles.label}>
						Title <Typography.Text className={styles.required}>*</Typography.Text>
					</Typography.Text>
					<Input
						value={name}
						autoFocus
						maxLength={DASHBOARD_NAME_MAX_LENGTH}
						placeholder="e.g. Sample Dashboard"
						testId="create-dashboard-name"
						onChange={(e: ChangeEvent<HTMLInputElement>): void =>
							setName(e.target.value)
						}
						onKeyDown={(e): void => {
							if (e.key === 'Enter') {
								void handleCreate();
							}
						}}
					/>
				</div>

				<div className={styles.field}>
					<Typography.Text className={styles.label}>Description</Typography.Text>
					{/* eslint-disable-next-line signoz/no-antd-components -- no @signozhq TextArea yet */}
					<AntInput.TextArea
						value={description}
						rows={3}
						placeholder="What is this dashboard for?"
						data-testid="create-dashboard-description"
						onChange={(e): void => setDescription(e.target.value)}
					/>
				</div>

				<div className={styles.field}>
					<Typography.Text className={styles.label}>Tags</Typography.Text>
					<TagKeyValueInput
						tags={tags}
						onTagsChange={setTags}
						placeholder="team:jarvis (press Enter)"
						testId="create-dashboard-tags"
					/>
					<Typography.Text className={styles.hint}>
						Use key:value (e.g. team:jarvis) and press Enter to add.
					</Typography.Text>
				</div>
			</div>

			<div className={styles.footer}>
				<Button
					variant="ghost"
					color="secondary"
					size="md"
					onClick={onClose}
					testId="create-dashboard-cancel"
				>
					Cancel
				</Button>
				<Button
					variant="solid"
					color="primary"
					size="md"
					disabled={!canSubmit}
					testId="create-dashboard-submit"
					onClick={(): void => {
						void handleCreate();
					}}
				>
					Create dashboard
				</Button>
			</div>
		</div>
	);
}

export default BlankDashboardPanel;
