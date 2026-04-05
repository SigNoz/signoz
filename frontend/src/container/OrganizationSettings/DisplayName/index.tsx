import { useTranslation } from 'react-i18next';
import { toast } from '@signozhq/sonner';
import { Button, Form, Input } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useUpdateMyOrganization } from 'api/generated/services/orgs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useAppContext } from 'providers/App/App';
import { IUser } from 'providers/App/types';
import { requireErrorMessage } from 'utils/form/requireErrorMessage';

function DisplayName({ index, id: orgId }: DisplayNameProps): JSX.Element {
	const [form] = Form.useForm<FormValues>();
	const orgName = Form.useWatch('displayName', form);

	const { t } = useTranslation(['organizationsettings', 'common']);
	const { org, updateOrg } = useAppContext();
	const { displayName } = (org || [])[index];

	const {
		mutateAsync: updateMyOrganization,
		isLoading,
	} = useUpdateMyOrganization({
		mutation: {
			onSuccess: (_, { data }) => {
				toast.success(t('success', { ns: 'common' }), {
					richColors: true,
					position: 'top-right',
				});
				updateOrg(orgId, data.displayName ?? '');
			},
			onError: (error) => {
				const apiError = convertToApiError(
					error as AxiosError<RenderErrorResponseDTO>,
				);
				toast.error(
					apiError?.getErrorMessage() ?? t('something_went_wrong', { ns: 'common' }),
					{ richColors: true, position: 'top-right' },
				);
			},
		},
	});

	const onSubmit = async (values: FormValues): Promise<void> => {
		const { displayName } = values;
		await updateMyOrganization({ data: { id: orgId, displayName } });
	};

	if (!org) {
		return <div />;
	}

	const isDisabled = isLoading || orgName === displayName || !orgName;

	return (
		<Form
			initialValues={{ displayName }}
			form={form}
			layout="vertical"
			onFinish={onSubmit}
			autoComplete="off"
		>
			<Form.Item
				name="displayName"
				label="Display name"
				rules={[{ required: true, message: requireErrorMessage('Display name') }]}
			>
				<Input size="large" placeholder={t('signoz')} />
			</Form.Item>
			<Form.Item>
				<Button
					loading={isLoading}
					disabled={isDisabled}
					type="primary"
					htmlType="submit"
				>
					Submit
				</Button>
			</Form.Item>
		</Form>
	);
}

interface DisplayNameProps {
	index: number;
	id: IUser['id'];
}

interface FormValues {
	displayName: string;
}

export default DisplayName;
