import { i18n, TFunction } from 'i18next';
import React from 'react';
import { I18nextProviderProps } from 'react-i18next';

const t: TFunction = (key: any): string => key;

const useMock = {
	t,
	i18n: {} as i18n,
	ready: true,
};

useMock.i18n = {} as i18n;

export const useTranslation = (): typeof useMock => useMock;

export const withTranslation = () => (
	Component: React.ComponentType<any>,
): React.ComponentType => Component;

export class InitReactI18next {
	init(): InitReactI18next {
		return this;
	}
}

export const I18nextProvider: React.FC<I18nextProviderProps> = ({
	children,
}) => ({
	children,
	key: 'i18n',
	props: {},
	type: 'div',
});
