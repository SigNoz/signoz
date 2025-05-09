package dashboardtypes

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"reflect"

	"github.com/SigNoz/signoz/pkg/errors"
)

type Data map[string]any

func NewData(input map[string]any) (Data, error) {
	title, ok := input["title"]
	if ok && title == "" || !ok {
		return Data{}, errors.Newf(errors.TypeInvalidInput, errors.CodeInvalidInput, "title is required")
	}

	return Data(input), nil
}

func (data Data) Value() (driver.Value, error) {
	return json.Marshal(data)
}

func (data *Data) Scan(val interface{}) error {
	var b []byte

	switch val := val.(type) {
	case []byte:
		b = val
	case string:
		b = []byte(val)
	default:
		return fmt.Errorf("data: (non-string \"%s\")", reflect.TypeOf(val).String())
	}

	return json.Unmarshal(b, data)
}

func (data Data) WidgetIDs() []string {
	if data["widgets"] == nil {
		return []string{}
	}

	widgets, ok := data["widgets"]
	if !ok {
		return []string{}
	}

	widgetsData, ok := widgets.([]any)
	if !ok {
		return []string{}
	}

	var widgetIDs []string
	for _, widget := range widgetsData {
		widgetData, ok := widget.(map[string]any)
		if ok && widgetData["query"] != nil && widgetData["id"] != nil {
			if id, ok := widgetData["id"].(string); ok {
				widgetIDs = append(widgetIDs, id)
			}
		}
	}

	return widgetIDs
}
