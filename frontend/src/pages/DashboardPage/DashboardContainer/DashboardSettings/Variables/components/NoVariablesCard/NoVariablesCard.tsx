import { Typography } from '@signozhq/ui/typography';
import AddVariableButton from '../AddVariableButton';
import { EditingState } from '../../types';
import styles from './NoVariables.module.scss';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

const NoVariablesCard = ({
	checks,
	disabledTooltip,
	setIsEditing,
}: {
	checks: BrandedPermission[];
	disabledTooltip?: string;
	setIsEditing: React.Dispatch<React.SetStateAction<EditingState | null>>;
}): JSX.Element => {
	return (
		<div className={styles.noVariablesCard}>
			<div className={styles.noVariablesCopy}>
				<Typography
					variant="paragraph"
					size="base"
					weight="medium"
					color="main"
					as="span"
					textOverflow="wrap"
				>
					No variables yet
				</Typography>
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="tertiary"
					as="span"
					textOverflow="wrap"
				>
					Create a variable to parameterize your panel queries.
				</Typography>
			</div>
			<AddVariableButton
				checks={checks}
				disabledTooltip={disabledTooltip}
				setIsEditing={setIsEditing}
			/>
		</div>
	);
};

export default NoVariablesCard;
