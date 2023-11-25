package formatter

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestToFixed(t *testing.T) {
	twoDecimals := 2
	require.Equal(t, "0", toFixed(0, nil))
	require.Equal(t, "61", toFixed(60.99, nil))
	require.Equal(t, "51.4", toFixed(51.42, nil))
	require.Equal(t, "51.42", toFixed(51.42, &twoDecimals))
}
