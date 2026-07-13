import { Typography } from '@signozhq/ui/typography';
import AddVariableButton from '../AddVariableButton';
import { EditingState } from '../../types';
import styles from './NoVariables.module.scss';

const NoVariablesCard = ({
	isEditable,
	setIsEditing,
}: {
	isEditable: boolean;
	setIsEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
}): JSX.Element => {
	return (
		<div className={styles.noVariablesCard}>
			<div className={styles.noVariablesCopy}>
				<Typography.Text className={styles.noVariablesTitle}>
					No variables yet
				</Typography.Text>
				<Typography.Text className={styles.noVariablesInfo}>
					Create a variable to parameterize your panel queries.
				</Typography.Text>
			</div>
			<AddVariableButton isEditable={isEditable} setIsEditing={setIsEditing} />
		</div>
	);
};

export default NoVariablesCard;
