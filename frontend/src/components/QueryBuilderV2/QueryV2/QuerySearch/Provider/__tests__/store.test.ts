import { createExpressionStore } from '../QuerySearchV2.store';

describe('createExpressionStore', () => {
	it('should create a store with initial state', () => {
		const store = createExpressionStore();
		const state = store.getState();

		expect(state.inputExpression).toBe('');
		expect(state.committedExpression).toBe('');
	});

	it('should update inputExpression via setInputExpression', () => {
		const store = createExpressionStore();

		store.getState().setInputExpression('service.name = "api"');

		expect(store.getState().inputExpression).toBe('service.name = "api"');
		expect(store.getState().committedExpression).toBe('');
	});

	it('should update both expressions via commitExpression', () => {
		const store = createExpressionStore();

		store.getState().setInputExpression('service.name = "api"');
		store.getState().commitExpression('service.name = "api"');

		expect(store.getState().inputExpression).toBe('service.name = "api"');
		expect(store.getState().committedExpression).toBe('service.name = "api"');
	});

	it('should reset all state via resetExpression', () => {
		const store = createExpressionStore();

		store.getState().setInputExpression('service.name = "api"');
		store.getState().commitExpression('service.name = "api"');
		store.getState().resetExpression();

		expect(store.getState().inputExpression).toBe('');
		expect(store.getState().committedExpression).toBe('');
	});

	it('should initialize from URL value', () => {
		const store = createExpressionStore();

		store.getState().initializeFromUrl('status = 500');

		expect(store.getState().inputExpression).toBe('status = 500');
		expect(store.getState().committedExpression).toBe('status = 500');
	});

	it('should create isolated store instances', () => {
		const store1 = createExpressionStore();
		const store2 = createExpressionStore();

		store1.getState().setInputExpression('expr1');
		store2.getState().setInputExpression('expr2');

		expect(store1.getState().inputExpression).toBe('expr1');
		expect(store2.getState().inputExpression).toBe('expr2');
	});
});
