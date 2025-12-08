import './FieldVariantBadges.styles.scss';

import cx from 'classnames';

/**
 * Field contexts that should display badges
 */
export enum AllowedFieldContext {
	Attribute = 'attribute',
	Resource = 'resource',
}

const ALLOWED_FIELD_CONTEXTS = new Set<string>([
	AllowedFieldContext.Attribute,
	AllowedFieldContext.Resource,
]);

interface FieldVariantBadgesProps {
	fieldDataType?: string;
	fieldContext?: string;
}

/**
 * Determines if a fieldContext badge should be displayed
 * Only shows badges for contexts in ALLOWED_FIELD_CONTEXTS
 */
const shouldShowFieldContextBadge = (
	fieldContext: string | undefined | null,
): boolean => {
	if (!fieldContext) {
		return false;
	}
	return ALLOWED_FIELD_CONTEXTS.has(fieldContext);
};

function FieldVariantBadges({
	fieldDataType,
	fieldContext,
}: FieldVariantBadgesProps): JSX.Element | null {
	// If neither value exists, don't render anything
	if (!fieldDataType && !fieldContext) {
		return null;
	}

	// Check if fieldContext should be displayed
	const showFieldContext =
		fieldContext && shouldShowFieldContextBadge(fieldContext);

	return (
		<span className="field-variant-badges-container">
			{fieldDataType && (
				<span className="field-badge data-type">{fieldDataType}</span>
			)}
			{showFieldContext && (
				<section className={cx('field-badge type-tag', fieldContext)}>
					<div className="dot" />
					<span className="text">{fieldContext}</span>
				</section>
			)}
		</span>
	);
}

FieldVariantBadges.defaultProps = {
	fieldDataType: undefined,
	fieldContext: undefined,
};

export default FieldVariantBadges;
