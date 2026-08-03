package dashboardtypes

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDashboardV2MetadataBaseValidateImage(t *testing.T) {
	valid := []string{
		"",                         // no image → default
		"/assets/Icons/eight-ball", // system icon path
		"/assets/Icons/whatever",   // unknown but well-formed icon path
		"/assets/Logos/aws-dark",   // logo path
		"data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", // base64 svg
		"data:image/png;base64,iVBORw0KGgo=",         // base64 png
	}
	for _, image := range valid {
		assert.NoError(t, DashboardV2MetadataBase{Image: image}.validateImage(), "expected %q to be accepted", image)
	}

	invalid := []string{
		"http://evil.com/x.svg",              // remote URL
		"javascript:alert(1)",                // javascript URI
		"data:text/html;base64,PHNjcmlwdD4=", // non-image data URI
		"<svg onload=alert(1)>",              // raw markup
		"/assets/Icons/",                     // prefix with no name
		"/assets/Logos/",                     // prefix with no name
		"not-a-path",                         // plain string
	}
	for _, image := range invalid {
		assert.Error(t, DashboardV2MetadataBase{Image: image}.validateImage(), "expected %q to be rejected", image)
	}
}
