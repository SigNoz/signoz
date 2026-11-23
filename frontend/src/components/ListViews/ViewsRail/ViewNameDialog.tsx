import {
	type ChangeEvent,
	type FormEvent,
	useEffect,
	useId,
	useRef,
	useState,
} from 'react';
import { Button } from '@signozhq/ui/button';
import { Dialog } from '@signozhq/ui/dialog';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';

import { VIEW_NAME_MAX_LENGTH } from '../constants';

import styles from './ViewsRail.module.scss';

interface Props {
	open: boolean;
	onClose: () => void;
	onSubmit: (name: string) => void;
	title: string;
	description: string;
	confirmLabel: string;
	/** Name the input holds each time the dialog opens. */
	initialName?: string;
	testIdPrefix: string;
}

function ViewNameDialog({
	open,
	onClose,
	onSubmit,
	title,
	description,
	confirmLabel,
	initialName = '',
	testIdPrefix,
}: Props): JSX.Element {
	const [name, setName] = useState(initialName);
	const inputRef = useRef<HTMLInputElement>(null);
	const formId = useId();
	const inputId = useId();

	useEffect(() => {
		if (open) {
			setName(initialName);
		}
	}, [open, initialName]);

	const trimmed = name.trim();
	const canSave = trimmed.length > 0 && trimmed.length <= VIEW_NAME_MAX_LENGTH;

	const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
		e.preventDefault();
		if (canSave) {
			onSubmit(trimmed);
			onClose();
		}
	};

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={title}
			description={description}
			width="narrow"
			initialFocus={inputRef}
			testId={`${testIdPrefix}-dialog`}
			footerSuffix={
				<>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						onClick={onClose}
						testId={`${testIdPrefix}-cancel`}
					>
						Cancel
					</Button>
					<Button
						variant="solid"
						color="primary"
						size="md"
						type="submit"
						form={formId}
						disabled={!canSave}
						disabledTooltip={
							trimmed.length === 0
								? 'Enter a view name first'
								: `Use at most ${VIEW_NAME_MAX_LENGTH} characters`
						}
						testId={`${testIdPrefix}-confirm`}
					>
						{confirmLabel}
					</Button>
				</>
			}
		>
			<form id={formId} className={styles.saveForm} onSubmit={handleSubmit}>
				<label htmlFor={inputId}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="main"
						as="span"
						textOverflow="wrap"
					>
						Name
					</Typography>
				</label>
				<Input
					ref={inputRef}
					id={inputId}
					value={name}
					maxLength={VIEW_NAME_MAX_LENGTH}
					placeholder="e.g. Prod alerts"
					autoComplete="off"
					testId={`${testIdPrefix}-name`}
					onChange={(e: ChangeEvent<HTMLInputElement>): void =>
						setName(e.target.value)
					}
				/>
			</form>
		</Dialog>
	);
}

export default ViewNameDialog;
