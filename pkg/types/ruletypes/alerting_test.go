package ruletypes

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/SigNoz/signoz/pkg/valuer"
	"github.com/stretchr/testify/assert"
)

func TestPanelTypeGetQueryRangeRequestType(t *testing.T) {
	testCases := []struct {
		name                string
		panelType           PanelType
		expectedRequestType qbtypes.RequestType
	}{
		{name: "Graph_TimeSeries", panelType: PanelTypeGraph, expectedRequestType: qbtypes.RequestTypeTimeSeries},
		{name: "Unset_TimeSeries", panelType: PanelType{}, expectedRequestType: qbtypes.RequestTypeTimeSeries},
		{name: "Unknown_TimeSeries", panelType: PanelType{valuer.NewString("pie")}, expectedRequestType: qbtypes.RequestTypeTimeSeries},
		{name: "Table_Scalar", panelType: PanelTypeTable, expectedRequestType: qbtypes.RequestTypeScalar},
		{name: "Value_Scalar", panelType: PanelTypeValue, expectedRequestType: qbtypes.RequestTypeScalar},
	}

	for _, testCase := range testCases {
		t.Run(testCase.name, func(t *testing.T) {
			assert.Equal(t, testCase.expectedRequestType, testCase.panelType.GetQueryRangeRequestType())
		})
	}
}
