import {
	getDefaultOption,
	getOptions,
} from 'container/Header/DateTimeSelection/config';
// import { AppState } from 'store/reducers';

const CheckRouteDefaultGlobalTimeOptions = ({
	route,
}: CheckRouteDefaultGlobalTimeOptionsProps): void => {
	cy.visit(Cypress.env('baseUrl') + route);

	const allOptions = getOptions(route);

	const defaultValue = getDefaultOption(route);

	const defaultSelectedOption = allOptions.find((e) => e.value === defaultValue);

	expect(defaultSelectedOption).not.undefined;

	cy
		.findAllByTestId('dropDown')
		.find('span')
		.then((el) => {
			const elements = el.get();

			const item = elements[1];

			expect(defaultSelectedOption?.label).to.be.equals(
				item.innerText,
				'Default option is not matching',
			);
		});

	// cy
	// 	.window()
	// 	.its('store')
	// 	.invoke('getState')
	// 	.then((e: AppState) => {
	// 		const { globalTime } = e;
	// 		const { maxTime, minTime } = globalTime;
	// 		// @TODO match the global min time and max time according to the selected option
	// 	});
};

export interface CheckRouteDefaultGlobalTimeOptionsProps {
	route: string;
}

export default CheckRouteDefaultGlobalTimeOptions;
