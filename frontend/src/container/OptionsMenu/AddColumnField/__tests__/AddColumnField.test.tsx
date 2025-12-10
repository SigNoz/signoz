import { render, screen } from '@testing-library/react';
import { TelemetryFieldKey } from 'api/v5/v5';

import {
	mockAllAvailableKeys,
	mockConflictingFieldsByContext,
	mockConflictingFieldsByDatatype,
	mockNonConflictingField,
} from '../../__tests__/mockData';
import AddColumnField from '../index';

describe('AddColumnField - Badge Display', () => {
	const defaultConfig = {
		isFetching: false,
		options: [],
		value: [],
		onSelect: jest.fn(),
		onFocus: jest.fn(),
		onBlur: jest.fn(),
		onSearch: jest.fn(),
		onRemove: jest.fn(),
		allAvailableKeys: mockAllAvailableKeys,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows badge for single selected conflicting field (different datatype)', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByDatatype[0], // Only string variant selected
		];

		render(
			<AddColumnField
				config={{
					...defaultConfig,
					value: selectedColumns,
				}}
			/>,
		);

		// Badge should appear even though only one variant is selected
		// because allAvailableKeys contains the conflicting variant
		const badgeContainer = screen.queryByText('http.status_code')?.closest('div');
		expect(badgeContainer).toBeInTheDocument();

		// Check for datatype badge
		const datatypeBadge = screen.queryByText('string');
		expect(datatypeBadge).toBeInTheDocument();
	});

	it('shows badges for multiple conflicting fields selected', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			...mockConflictingFieldsByDatatype, // Both string and number variants
		];

		render(
			<AddColumnField
				config={{
					...defaultConfig,
					value: selectedColumns,
				}}
			/>,
		);

		// Both variants should show badges
		const stringBadge = screen.getByText('string');
		const numberBadge = screen.getByText('number');
		expect(stringBadge).toBeInTheDocument();
		expect(numberBadge).toBeInTheDocument();
	});

	it('shows badges when all conflicting variants are selected', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			...mockConflictingFieldsByDatatype, // All variants selected
		];

		render(
			<AddColumnField
				config={{
					...defaultConfig,
					value: selectedColumns,
				}}
			/>,
		);

		// Both variants should appear as separate items in the list
		const fieldNames = screen.getAllByText('http.status_code');
		expect(fieldNames).toHaveLength(2); // One for each variant

		// Badges should still be visible when all variants are selected
		const stringBadge = screen.getByText('string');
		const numberBadge = screen.getByText('number');
		expect(stringBadge).toBeInTheDocument();
		expect(numberBadge).toBeInTheDocument();
	});

	it('does not show badge for non-conflicting field', () => {
		const selectedColumns: TelemetryFieldKey[] = [...mockNonConflictingField];

		render(
			<AddColumnField
				config={{
					...defaultConfig,
					value: selectedColumns,
				}}
			/>,
		);

		// Field name should be visible
		expect(screen.getByText('trace_id')).toBeInTheDocument();

		// But no badge should appear (no conflicting variants)
		const badgeContainer = document.querySelector(
			'.field-variant-badges-container',
		);
		expect(badgeContainer).not.toBeInTheDocument();
	});

	it('shows context badge for attribute/resource conflicting fields', () => {
		const selectedColumns: TelemetryFieldKey[] = [
			mockConflictingFieldsByContext[0], // resource variant
		];

		render(
			<AddColumnField
				config={{
					...defaultConfig,
					value: selectedColumns,
				}}
			/>,
		);

		// Context badge should appear for resource
		const contextBadge = screen.queryByText('resource');
		expect(contextBadge).toBeInTheDocument();
	});
});
