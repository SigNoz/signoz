import { ReactNode } from 'react';
import { CircleHelp } from '@signozhq/icons';
import { Tooltip } from '@signozhq/ui/tooltip';
import { Typography } from '@signozhq/ui/typography';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import styles from './FormField.module.scss';

interface FormFieldProps {
	label?: ReactNode;
	help?: ReactNode;
	tooltip?: string;
	required?: boolean;
	error?: string;
	htmlFor?: string;
	children: ReactNode;
}

function FormField({
	label,
	help,
	tooltip,
	required,
	error,
	htmlFor,
	children,
}: FormFieldProps): JSX.Element {
	const hint = tooltip ? (
		<MarkdownRenderer markdownContent={tooltip} variables={{}} />
	) : (
		help
	);

	return (
		<div className={styles.field}>
			{!!label && (
				<label className={styles.label} htmlFor={htmlFor}>
					<Typography
						variant="paragraph"
						size="small"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						{label}
					</Typography>
					{!!required && (
						<span aria-hidden="true" className={styles.required}>
							*
						</span>
					)}
					{!!hint && (
						<Tooltip title={hint}>
							<CircleHelp size={12} className={styles.hint} />
						</Tooltip>
					)}
				</label>
			)}
			{children}
			{!!error && (
				<Typography
					variant="paragraph"
					size="small"
					weight="regular"
					color="danger"
					as="span"
					textOverflow="wrap"
				>
					{error}
				</Typography>
			)}
		</div>
	);
}

export default FormField;
