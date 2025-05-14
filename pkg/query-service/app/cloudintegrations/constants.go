package cloudintegrations

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/aws/aws-sdk-go/aws/endpoints"
)

var (
	CodeInvalidCloudRegion    = errors.MustNewCode("invalid_cloud_region")
	CodeMismatchCloudProvider = errors.MustNewCode("cloud_provider_mismatch")
)

// List of all valid cloud regions on Amazon Web Services
var ValidAWSRegions = map[string]bool{
	endpoints.AfSouth1RegionID:     true,
	endpoints.ApEast1RegionID:      true,
	endpoints.ApNortheast1RegionID: true,
	endpoints.ApNortheast2RegionID: true,
	endpoints.ApNortheast3RegionID: true,
	endpoints.ApSouth1RegionID:     true,
	endpoints.ApSouth2RegionID:     true,
	endpoints.ApSoutheast1RegionID: true,
	endpoints.ApSoutheast2RegionID: true,
	endpoints.ApSoutheast3RegionID: true,
	endpoints.ApSoutheast4RegionID: true,
	endpoints.CaCentral1RegionID:   true,
	endpoints.CaWest1RegionID:      true,
	endpoints.EuCentral1RegionID:   true,
	endpoints.EuCentral2RegionID:   true,
	endpoints.EuNorth1RegionID:     true,
	endpoints.EuSouth1RegionID:     true,
	endpoints.EuSouth2RegionID:     true,
	endpoints.EuWest1RegionID:      true,
	endpoints.EuWest2RegionID:      true,
	endpoints.EuWest3RegionID:      true,
	endpoints.IlCentral1RegionID:   true,
	endpoints.MeCentral1RegionID:   true,
	endpoints.MeSouth1RegionID:     true,
	endpoints.SaEast1RegionID:      true,
	endpoints.UsEast1RegionID:      true,
	endpoints.UsEast2RegionID:      true,
	endpoints.UsWest1RegionID:      true,
	endpoints.UsWest2RegionID:      true,
}
