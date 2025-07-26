package querybuilder

import (
	"os"
	"strings"
)

var QBV5Enabled = false

func init() {
	v := os.Getenv("ENABLE_QB_V5")
	if strings.ToLower(v) == "true" || strings.ToLower(v) == "1" {
		QBV5Enabled = true
	}
}
