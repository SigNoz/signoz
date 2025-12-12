package signozapiserver

import (
	"github.com/SigNoz/signoz/pkg/http/handler"
	"github.com/SigNoz/signoz/pkg/types"
	"github.com/SigNoz/signoz/pkg/types/ctxtypes"
)

func newSecuritySchemes(role types.Role) []handler.OpenAPISecurityScheme {
	return []handler.OpenAPISecurityScheme{
		{Name: ctxtypes.AuthTypeAPIKey.StringValue(), Scopes: []string{role.String()}},
		{Name: ctxtypes.AuthTypeTokenizer.StringValue(), Scopes: []string{role.String()}},
	}
}
