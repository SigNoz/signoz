package querybuildertypesv5

import "github.com/SigNoz/signoz/pkg/valuer"

type PanelType struct {
	valuer.String
}

var (
	PanelTypeUnknown   = PanelType{valuer.NewString("")}
	PanelTypeLine      = PanelType{valuer.NewString("line")}
	PanelTypeNumber    = PanelType{valuer.NewString("number")}
	PanelTypeList      = PanelType{valuer.NewString("list")}
	PanelTypeTrace     = PanelType{valuer.NewString("trace")}
	PanelTypeBar       = PanelType{valuer.NewString("bar")}
	PanelTypeTable     = PanelType{valuer.NewString("table")}
	PanelTypePie       = PanelType{valuer.NewString("pie")}
	PanelTypeScatter   = PanelType{valuer.NewString("scatter")}
	PanelTypeHeatmap   = PanelType{valuer.NewString("heatmap")}
	PanelTypeHistogram = PanelType{valuer.NewString("histogram")}
)
