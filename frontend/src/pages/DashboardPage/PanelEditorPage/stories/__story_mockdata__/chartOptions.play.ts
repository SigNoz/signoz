/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { expect, screen, userEvent, waitFor } from 'storybook/test';

import {
	expandSection,
	openConfigSelect,
	pickSegment,
} from '../PanelEditorPage.stories.mocks';

export const openTimePreference = async (): Promise<void> => {
	await openConfigSelect('panel-editor-v2-time-preference');
	await screen.findByRole('listbox');
};

export const openFormatting = async (): Promise<void> => {
	await expandSection('Formatting & Units');
	await screen.findByTestId('panel-editor-v2-decimals');
};

export const openUnitPicker = async (): Promise<void> => {
	await openFormatting();
	await openConfigSelect('panel-editor-v2-unit');
	await screen.findByRole('listbox');
};

export const openAxes = async (): Promise<void> => {
	await expandSection('Axes');
	await screen.findByTestId('panel-editor-v2-log-scale');
};

export const pickLogScale = async (): Promise<void> => {
	await openAxes();
	await pickSegment('panel-editor-v2-log-scale', 'log');
};

export const openLegend = async (): Promise<void> => {
	await expandSection('Legend');
	await screen.findByTestId('panel-editor-v2-legend-position');
};

export const moveLegendRight = async (): Promise<void> => {
	await openLegend();
	await pickSegment('panel-editor-v2-legend-position', 'right');
};

export const openChartAppearance = async (): Promise<void> => {
	await expandSection('Chart appearance');
	await screen.findByTestId('panel-editor-v2-line-style');
};

export const pickDashedGradientWithPoints = async (): Promise<void> => {
	await openChartAppearance();
	await pickSegment('panel-editor-v2-line-style', 'dashed');
	await pickSegment('panel-editor-v2-fill-mode', 'gradient');
	const points = screen.getByTestId('panel-editor-v2-show-points');

	await userEvent.click(points);
	await waitFor(() => expect(points).toHaveAttribute('aria-checked', 'true'));
};

export const openAreaChartAppearance = async (): Promise<void> => {
	await expandSection('Chart appearance');
	await screen.findByTestId('panel-editor-v2-fill-opacity');
};

export const stackBars = async (): Promise<void> => {
	await expandSection('Visualization');
	await pickSegment('panel-editor-v2-stacked-bar-chart', 'stacked');
};

export const openHistogramBuckets = async (): Promise<void> => {
	await expandSection('Buckets');
	await screen.findByTestId('panel-editor-v2-bucket-count');
};

export const openTextAppearance = async (): Promise<void> => {
	await expandSection('Panel appearance');
	await screen.findByTestId('text-layout-align');
};

export const openTopListAppearance = async (): Promise<void> => {
	await expandSection('Appearance');
	await screen.findByTestId('panel-editor-v2-show-rank');
	await screen.findByTestId('panel-editor-v2-bar-color');
};
