package funnels

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestFunnelOperations tests creating, retrieving, and modifying funnels
func TestFunnelOperations(t *testing.T) {
	assert := assert.New(t)

	type FunnelOperationsTest struct {
		testName        string
		userID          string
		funnelName      string
		steps           []FunnelStep
		stepToUpdate    int
		newSpanName     string
		expectedSuccess bool
	}

	var tests = []FunnelOperationsTest{
		{
			testName:   "Create checkout funnel",
			userID:     "demo-user",
			funnelName: "checkout-flow",
			steps: []FunnelStep{
				{
					ServiceName: "frontend-service",
					SpanName:    "load-product-page",
					Filters: map[string]interface{}{
						"product_id": "123",
					},
				},
				{
					ServiceName: "cart-service",
					SpanName:    "add-to-cart",
					Filters: map[string]interface{}{
						"cart_id": "456",
					},
				},
				{
					ServiceName: "payment-service",
					SpanName:    "process-payment",
					Filters: map[string]interface{}{
						"payment_method": "credit-card",
					},
				},
			},
			stepToUpdate:    1,
			newSpanName:     "view-product-details",
			expectedSuccess: true,
		},
		{
			testName:   "Create simple funnel",
			userID:     "test-user",
			funnelName: "simple-flow",
			steps: []FunnelStep{
				{
					ServiceName: "api-service",
					SpanName:    "get-data",
					Filters: map[string]interface{}{
						"endpoint": "/api/data",
					},
				},
			},
			stepToUpdate:    1,
			newSpanName:     "fetch-data",
			expectedSuccess: true,
		},
	}
	for _, test := range tests {
		t.Run(test.testName, func(t *testing.T) {
			// Create a new in-memory storage
			storage := NewInMemoryFunnelStorage()
			// Create a context
			ctx := context.Background()
			// Create a new funnel
			funnel := NewFunnel(test.funnelName, test.userID)
			// Add steps to the funnel
			for _, step := range test.steps {
				funnel.AddStep(step)
			}
			// Save the funnel in memory
			err := storage.CreateFunnel(ctx, funnel)
			assert.NoError(err, "Failed to create funnel")
			// Retrieve the funnel details using funnel name
			retrievedFunnel, err := storage.GetFunnel(ctx, test.funnelName, test.userID)
			assert.NoError(err, "Failed to retrieve funnel")
			assert.Equal(test.funnelName, retrievedFunnel.FunnelName, "Funnel name mismatch")
			assert.Equal(test.userID, retrievedFunnel.User, "User ID mismatch")
			assert.Equal(len(test.steps), len(retrievedFunnel.Steps), "Step count mismatch")
			// Verify each step
			for i, expectedStep := range test.steps {
				actualStep := retrievedFunnel.Steps[i]
				assert.Equal(expectedStep.ServiceName, actualStep.ServiceName, "Service name mismatch in step %d", i+1)
				assert.Equal(expectedStep.SpanName, actualStep.SpanName, "Span name mismatch in step %d", i+1)
				assert.Equal(i+1, int(actualStep.Order), "Step order mismatch")
			}
			// Example of updating a step
			if len(retrievedFunnel.Steps) >= test.stepToUpdate {
				updatedStep := retrievedFunnel.Steps[test.stepToUpdate-1]
				updatedStep.SpanName = test.newSpanName
				err = retrievedFunnel.UpdateStep(int64(test.stepToUpdate), updatedStep)
				assert.NoError(err, "Failed to update step")
				err = storage.UpdateFunnel(ctx, retrievedFunnel)
				assert.NoError(err, "Failed to update funnel")
				// Retrieve the updated funnel
				updatedFunnel, err := storage.GetFunnel(ctx, test.funnelName, test.userID)
				assert.NoError(err, "Failed to retrieve updated funnel")
				assert.Equal(test.newSpanName, updatedFunnel.Steps[test.stepToUpdate-1].SpanName, "Updated span name mismatch")
			}
		})
	}
}

// TestFunnelStepManagement tests adding, updating, and deleting steps
func TestFunnelStepManagement(t *testing.T) {
	assert := assert.New(t)
	type FunnelStepTest struct {
		testName     string
		initialSteps []FunnelStep
		operation    string // "add", "update", "delete"
		targetOrder  int64
		newStep      FunnelStep
		expectError  bool
	}
	var tests = []FunnelStepTest{
		{
			testName: "Add new step",
			initialSteps: []FunnelStep{
				{
					ServiceName: "service-a",
					SpanName:    "span-a",
				},
			},
			operation:   "add",
			newStep:     FunnelStep{ServiceName: "service-b", SpanName: "span-b"},
			expectError: false,
		},
		{
			testName: "Update existing step",
			initialSteps: []FunnelStep{
				{
					ServiceName: "service-a",
					SpanName:    "span-a",
				},
				{
					ServiceName: "service-b",
					SpanName:    "span-b",
				},
			},
			operation:   "update",
			targetOrder: 2,
			newStep:     FunnelStep{ServiceName: "service-b", SpanName: "updated-span"},
			expectError: false,
		},
		{
			testName: "Delete existing step",
			initialSteps: []FunnelStep{
				{
					ServiceName: "service-a",
					SpanName:    "span-a",
				},
				{
					ServiceName: "service-b",
					SpanName:    "span-b",
				},
			},
			operation:   "delete",
			targetOrder: 1,
			expectError: false,
		},
		{
			testName: "Update non-existent step",
			initialSteps: []FunnelStep{
				{
					ServiceName: "service-a",
					SpanName:    "span-a",
				},
			},
			operation:   "update",
			targetOrder: 5,
			newStep:     FunnelStep{ServiceName: "service-x", SpanName: "span-x"},
			expectError: true,
		},
		{
			testName: "Delete non-existent step",
			initialSteps: []FunnelStep{
				{
					ServiceName: "service-a",
					SpanName:    "span-a",
				},
			},
			operation:   "delete",
			targetOrder: 5,
			expectError: true,
		},
	}
	for _, test := range tests {
		t.Run(test.testName, func(t *testing.T) {
			// Create a new funnel with the initial steps
			funnel := NewFunnel("test-funnel", "test-user")
			// Add initial steps
			for _, step := range test.initialSteps {
				funnel.AddStep(step)
			}
			var err error
			// Perform the requested operation
			switch test.operation {
			case "add":
				funnel.AddStep(test.newStep)
				assert.Equal(len(test.initialSteps)+1, len(funnel.Steps), "Step count should increase after add")
				assert.Equal(test.newStep.ServiceName, funnel.Steps[len(funnel.Steps)-1].ServiceName, "Added step service name mismatch")
				assert.Equal(test.newStep.SpanName, funnel.Steps[len(funnel.Steps)-1].SpanName, "Added step span name mismatch")
			case "update":
				err = funnel.UpdateStep(test.targetOrder, test.newStep)
				if test.expectError {
					assert.Error(err, "Expected error when updating non-existent step")
				} else {
					assert.NoError(err, "Failed to update step")
					// Find the step with the matching order
					var updatedStep *FunnelStep
					for i := range funnel.Steps {
						if funnel.Steps[i].Order == test.targetOrder {
							updatedStep = &funnel.Steps[i]
							break
						}
					}
					assert.NotNil(updatedStep, "Updated step should exist")
					if updatedStep != nil {
						assert.Equal(test.newStep.ServiceName, updatedStep.ServiceName, "Updated step service name mismatch")
						assert.Equal(test.newStep.SpanName, updatedStep.SpanName, "Updated step span name mismatch")
					}
				}
			case "delete":
				initialCount := len(funnel.Steps)
				err = funnel.DeleteStep(test.targetOrder)
				if test.expectError {
					assert.Error(err, "Expected error when deleting non-existent step")
					assert.Equal(initialCount, len(funnel.Steps), "Step count should not change after failed delete")
				} else {
					assert.NoError(err, "Failed to delete step")
					assert.Equal(initialCount-1, len(funnel.Steps), "Step count should decrease after delete")
				}
			}
		})
	}
}

// TestFunnelStorageOperations tests storage-related operations
func TestFunnelStorageOperations(t *testing.T) {
	assert := assert.New(t)
	type StorageTest struct {
		testName      string
		operation     string // "create", "get", "update", "delete", "list"
		funnelName    string
		userID        string
		steps         []FunnelStep
		updateSteps   []FunnelStep
		expectedCount int
		expectError   bool
	}
	var tests = []StorageTest{
		{
			testName:    "Create new funnel",
			operation:   "create",
			funnelName:  "funnel1",
			userID:      "user1",
			steps:       []FunnelStep{{ServiceName: "service1", SpanName: "span1"}},
			expectError: false,
		},
		{
			testName:    "Get existing funnel",
			operation:   "get",
			funnelName:  "funnel1",
			userID:      "user1",
			expectError: false,
		},
		{
			testName:    "Update existing funnel",
			operation:   "update",
			funnelName:  "funnel1",
			userID:      "user1",
			updateSteps: []FunnelStep{{ServiceName: "service1", SpanName: "updated-span"}},
			expectError: false,
		},
		{
			testName:    "Get non-existent funnel",
			operation:   "get",
			funnelName:  "non-existent",
			userID:      "user1",
			expectError: true,
		},
		{
			testName:      "List funnels for user",
			operation:     "list",
			userID:        "user1",
			expectedCount: 1,
			expectError:   false,
		},
		{
			testName:    "Delete existing funnel",
			operation:   "delete",
			funnelName:  "funnel1",
			userID:      "user1",
			expectError: false,
		},
		{
			testName:      "List funnels after delete",
			operation:     "list",
			userID:        "user1",
			expectedCount: 0,
			expectError:   false,
		},
	}
	// Create a shared storage instance for all tests
	storage := NewInMemoryFunnelStorage()
	ctx := context.Background()
	for _, test := range tests {
		t.Run(test.testName, func(t *testing.T) {
			var err error
			switch test.operation {
			case "create":
				funnel := NewFunnel(test.funnelName, test.userID)
				for _, step := range test.steps {
					funnel.AddStep(step)
				}
				err = storage.CreateFunnel(ctx, funnel)
			case "get":
				_, err = storage.GetFunnel(ctx, test.funnelName, test.userID)
			case "update":
				// First get the funnel
				funnel, getErr := storage.GetFunnel(ctx, test.funnelName, test.userID)
				if getErr != nil {
					err = getErr
					break
				}
				// Replace steps if requested
				if len(test.updateSteps) > 0 {
					funnel.Steps = []FunnelStep{}
					for _, step := range test.updateSteps {
						funnel.AddStep(step)
					}
				}
				err = storage.UpdateFunnel(ctx, funnel)
			case "delete":
				err = storage.DeleteFunnel(ctx, test.funnelName, test.userID)
			case "list":
				funnels, listErr := storage.ListFunnels(ctx, test.userID)
				if listErr != nil {
					err = listErr
					break
				}
				assert.Equal(test.expectedCount, len(funnels), "Expected funnel count mismatch")
			}
			// Check if error matches expectations
			if test.expectError {
				assert.Error(err, "Expected an error")
			} else {
				assert.NoError(err, "Did not expect an error")
			}
		})
	}
}
