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
					<Typography.Text size="sm">{label}</Typography.Text>
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
				<Typography.Text size="sm" color="danger">
					{error}
				</Typography.Text>
			)}
		</div>
	);
}

export default FormField;
