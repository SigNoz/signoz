package queryBuilderToExpr

import (
	"testing"

	qbtypes "github.com/SigNoz/signoz/pkg/types/querybuildertypes/querybuildertypesv5"
	"github.com/stretchr/testify/assert"
)

var testCases = []struct {
	Name        string
	Query       *qbtypes.Filter
	Expr        string
	ExpectError bool
}{
	{
		Name: "equal",
		Query: &qbtypes.Filter{
			Expression: "attribute.key = 'checkbody'",
		},
		Expr: `(attributes["key"] == "checkbody")`,
	},
	{
		Name: "not equal",
		Query: &qbtypes.Filter{
			Expression: "attribute.key != 'checkbody'",
		},
		Expr: `(attributes["key"] != "checkbody")`,
	},
	{
		Name: "less than",
		Query: &qbtypes.Filter{
			Expression: "attribute.key < 10",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] < 10.000000)`,
	},
	{
		Name: "greater than",
		Query: &qbtypes.Filter{
			Expression: "attribute.key > 10",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] > 10.000000)`,
	},
	{
		Name: "less than equal",
		Query: &qbtypes.Filter{
			Expression: "attribute.key <= 10",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] <= 10.000000)`,
	},
	{
		Name: "greater than equal",
		Query: &qbtypes.Filter{
			Expression: "attribute.key >= 10",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] >= 10.000000)`,
	},
	// case sensitive
	{
		Name: "body contains",
		Query: &qbtypes.Filter{
			Expression: "body CONTAINS 'checkbody'",
		},
		Expr: `(body != nil && lower(body) contains lower("checkbody"))`,
	},
	{
		Name: "body.log.message EXISTS",
		Query: &qbtypes.Filter{
			Expression: "body.log.message EXISTS",
		},
		Expr: `("log.message" in fromJSON(body))`,
	},
	{
		Name: "body.log.message not exists",
		Query: &qbtypes.Filter{
			Expression: "body.log.message NOT EXISTS",
		},
		Expr: `("log.message" not in fromJSON(body))`,
	},
	{
		Name: "body.log.message NOT nil",
		Query: &qbtypes.Filter{
			Expression: "body.log.message != nil",
		},
		Expr: `(log.message != "nil")`,
	},
	{
		Name: "body ncontains",
		Query: &qbtypes.Filter{
			Expression: "body NOT CONTAINS 'checkbody'",
		},
		Expr: `(body != nil && lower(body) not contains lower("checkbody"))`,
	},
	{
		Name: "body regex",
		Query: &qbtypes.Filter{
			Expression: "body REGEXP '[0-1]+regex$'",
		},
		Expr: `(body != nil && body matches "[0-1]+regex$")`,
	},
	{
		Name: "body not regex",
		Query: &qbtypes.Filter{
			Expression: "body NOT REGEXP '[0-1]+regex$'",
		},
		Expr: `(body != nil && body not matches "[0-1]+regex$")`,
	},
	{
		Name: "regex with escape characters",
		Query: &qbtypes.Filter{
			Expression: "body REGEXP '^Executing \\[\\S+@\\S+:[0-9]+\\] \\S+\".*'",
		},
		Expr: `(body != nil && body matches "^Executing \\[\\S+@\\S+:[0-9]+\\] \\S+\".*")`,
	},
	{
		Name: "invalid regex",
		Query: &qbtypes.Filter{
			Expression: "body NOT REGEXP '[0-9]++'",
		},
		ExpectError: true,
	},
	{
		Name: "in",
		Query: &qbtypes.Filter{
			Expression: "attribute.key IN [1,2,3,4]",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] in [1,2,3,4])`,
	},
	{
		Name: "not in",
		Query: &qbtypes.Filter{
			Expression: "attribute.key NOT IN ['1','2']",
		},
		Expr: `(attributes["key"] != nil && attributes["key"] not in ['1','2'])`,
	},
	{
		Name: "exists",
		Query: &qbtypes.Filter{
			Expression: "attribute.key EXISTS",
		},
		Expr: `("key" in attributes)`,
	},
	{
		Name: "not exists",
		Query: &qbtypes.Filter{
			Expression: "attribute.key NOT EXISTS",
		},
		Expr: `("key" not in attributes)`,
	},
	{
		Name: "trace_id not exists",
		Query: &qbtypes.Filter{
			Expression: "trace_id NOT EXISTS",
		},
		Expr: `(trace_id == nil)`,
	},
	{
		Name: "trace_id exists",
		Query: &qbtypes.Filter{
			Expression: "trace_id EXISTS",
		},
		Expr: `(trace_id != nil)`,
	},
	{
		Name: "span_id not exists",
		Query: &qbtypes.Filter{
			Expression: "span_id NOT EXISTS",
		},
		Expr: `(span_id == nil)`,
	},
	{
		Name: "span_id exists",
		Query: &qbtypes.Filter{
			Expression: "span_id EXISTS",
		},
		Expr: `(span_id != nil)`,
	},
	{
		Name: "Multi filter",
		Query: &qbtypes.Filter{
			Expression: "(attribute.key <= 10 AND body NOT REGEXP '[0-1]+regex$') OR attribute.key NOT EXISTS",
		},
		Expr: `(((attributes["key"] != nil && attributes["key"] <= 10.000000) and (body != nil && body not matches "[0-1]+regex$")) or ("key" not in attributes)`,
	},
	{
		Name: "incorrect multi filter",
		Query: &qbtypes.Filter{
			Expression: "attribute.key <= 10 AND body NOT REGEXP '[0-9]++' AND attribute.key NOT EXISTS",
		},
		ExpectError: true,
	},
	{
		Name: "nested conditions",
		Query: &qbtypes.Filter{
			Expression: "attribute.key <= 10 AND (body.merchantId EXISTS OR body.merchant_id EXISTS)",
		},
		Expr: `((attributes["key"] != nil && attributes["key"] <= 10.000000) and (("merchantId" in fromJSON(body)) or ("merchant_id" in fromJSON(body))))`,
	},
}

func TestParse(t *testing.T) {
	for _, tt := range testCases {
		t.Run(tt.Name, func(t *testing.T) {
			x, err := Parse(tt.Query)
			if tt.ExpectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.Expr, x)
			}
		})
	}
}
