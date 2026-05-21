import { useTranslation } from 'react-i18next';
import { SaveConfigWrapper } from './styles';
import { Button } from '@signozhq/ui/button';

function SaveConfigButton({
	showSaveButton,
	onSaveConfigurationHandler,
	onCancelConfigurationHandler,
}: SaveConfigButtonTypes): JSX.Element {
	const { t } = useTranslation('pipeline');

	return (
		<SaveConfigWrapper>
			{showSaveButton && (
				<Button key="submit" onClick={onSaveConfigurationHandler} type="submit">
					{t('save_configuration')}
				</Button>
			)}
			<Button
				key="cancel"
				onClick={onCancelConfigurationHandler}
				variant="outlined"
				color="secondary"
			>
				{t('cancel')}
			</Button>
		</SaveConfigWrapper>
	);
}
export interface SaveConfigButtonTypes {
	showSaveButton: boolean;
	onSaveConfigurationHandler: VoidFunction;
	onCancelConfigurationHandler: VoidFunction;
}

export default SaveConfigButton;
