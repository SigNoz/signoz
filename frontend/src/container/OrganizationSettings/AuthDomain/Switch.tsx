import { Switch } from 'antd';
import put from 'api/v1/domains/put';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { useState } from 'react';
import APIError from 'types/api/error';
import { GettableAuthDomain } from 'types/api/v1/domains/list';

function SwitchComponent({
	isDefaultChecked,
	record,
}: SwitchComponentProps): JSX.Element {
	const [isChecked, setIsChecked] = useState<boolean>(isDefaultChecked);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const { showErrorModal } = useErrorModal();

	const onChangeHandler = async (checked: boolean): Promise<void> => {
		setIsLoading(true);

		try {
			await put({
				...record,
				ssoEnabled: checked,
			});
			setIsChecked(checked);
		} catch (error) {
			showErrorModal(error as APIError);
		}

		setIsLoading(false);
	};

	return (
		<Switch loading={isLoading} checked={isChecked} onChange={onChangeHandler} />
	);
}

interface SwitchComponentProps {
	isDefaultChecked: boolean;
	record: GettableAuthDomain;
}

export default SwitchComponent;
