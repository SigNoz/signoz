import { ReactNode } from 'react';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';
import { FieldError } from 'react-hook-form';

import FieldLabel from './FieldLabel';

import styles from './FormField.module.scss';

interface FormFieldProps {
	htmlFor: string;
	label: string;
	tooltip: string;
	required?: boolean;
	error?: FieldError;
	className?: string;
	children: ReactNode;
}

/** A labelled setup drawer field with its validation message below the input. */
function FormField({
	htmlFor,
	label,
	tooltip,
	required,
	error,
	className,
	children,
}: FormFieldProps): JSX.Element {
	return (
		<div className={cx(styles.drawerSection, className)}>
			<FieldLabel
				htmlFor={htmlFor}
				label={label}
				tooltip={tooltip}
				required={required}
			/>
			{children}
			{error && (
				<span className={styles.fieldError}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
						role="alert"
					>
						{error.message}
					</Typography>
				</span>
			)}
		</div>
	);
}

FormField.defaultProps = {
	required: false,
	error: undefined,
	className: undefined,
};

export default FormField;
