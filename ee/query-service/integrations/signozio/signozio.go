package signozio

import (
	"context"
	"encoding/json"

	"github.com/SigNoz/signoz/ee/query-service/model"
	"github.com/SigNoz/signoz/pkg/zeus"
)

// SendUsage reports the usage of signoz to license server
func SendUsage(ctx context.Context, usage model.UsagePayload, zeus zeus.Zeus) error {
	body, err := json.Marshal(usage)
	if err != nil {
		return err
	}

	return zeus.PutMeters(ctx, usage.LicenseKey.String(), body)
}
