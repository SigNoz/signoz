package integrationtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
)

var (
	CodeInvalidCloudRegion    = errors.MustNewCode("invalid_cloud_region")
	CodeMismatchCloudProvider = errors.MustNewCode("cloud_provider_mismatch")
)

// List of all valid cloud regions on Amazon Web Services
var ValidAWSRegions = map[string]bool{
	"af-south-1":     true, // Africa (Cape Town).
	"ap-east-1":      true, // Asia Pacific (Hong Kong).
	"ap-northeast-1": true, // Asia Pacific (Tokyo).
	"ap-northeast-2": true, // Asia Pacific (Seoul).
	"ap-northeast-3": true, // Asia Pacific (Osaka).
	"ap-south-1":     true, // Asia Pacific (Mumbai).
	"ap-south-2":     true, // Asia Pacific (Hyderabad).
	"ap-southeast-1": true, // Asia Pacific (Singapore).
	"ap-southeast-2": true, // Asia Pacific (Sydney).
	"ap-southeast-3": true, // Asia Pacific (Jakarta).
	"ap-southeast-4": true, // Asia Pacific (Melbourne).
	"ca-central-1":   true, // Canada (Central).
	"ca-west-1":      true, // Canada West (Calgary).
	"eu-central-1":   true, // Europe (Frankfurt).
	"eu-central-2":   true, // Europe (Zurich).
	"eu-north-1":     true, // Europe (Stockholm).
	"eu-south-1":     true, // Europe (Milan).
	"eu-south-2":     true, // Europe (Spain).
	"eu-west-1":      true, // Europe (Ireland).
	"eu-west-2":      true, // Europe (London).
	"eu-west-3":      true, // Europe (Paris).
	"il-central-1":   true, // Israel (Tel Aviv).
	"me-central-1":   true, // Middle East (UAE).
	"me-south-1":     true, // Middle East (Bahrain).
	"sa-east-1":      true, // South America (Sao Paulo).
	"us-east-1":      true, // US East (N. Virginia).
	"us-east-2":      true, // US East (Ohio).
	"us-west-1":      true, // US West (N. California).
	"us-west-2":      true, // US West (Oregon).
}

var ValidAzureRegions = map[string]bool{
	"australiacentral":   true,
	"australiacentral2":  true,
	"australiaeast":      true,
	"australiasoutheast": true,
	"austriaeast":        true,
	"belgiumcentral":     true,
	"brazilsouth":        true,
	"brazilsoutheast":    true,
	"canadacentral":      true,
	"canadaeast":         true,
	"centralindia":       true,
	"centralus":          true,
	"chilecentral":       true,
	"denmarkeast":        true,
	"eastasia":           true,
	"eastus":             true,
	"eastus2":            true,
	"francecentral":      true,
	"francesouth":        true,
	"germanynorth":       true,
	"germanywestcentral": true,
	"indonesiacentral":   true,
	"israelcentral":      true,
	"italynorth":         true,
	"japaneast":          true,
	"japanwest":          true,
	"koreacentral":       true,
	"koreasouth":         true,
	"malaysiawest":       true,
	"mexicocentral":      true,
	"newzealandnorth":    true,
	"northcentralus":     true,
	"northeurope":        true,
	"norwayeast":         true,
	"norwaywest":         true,
	"polandcentral":      true,
	"qatarcentral":       true,
	"southafricanorth":   true,
	"southafricawest":    true,
	"southcentralus":     true,
	"southindia":         true,
	"southeastasia":      true,
	"spaincentral":       true,
	"swedencentral":      true,
	"switzerlandnorth":   true,
	"switzerlandwest":    true,
	"uaecentral":         true,
	"uaenorth":           true,
	"uksouth":            true,
	"ukwest":             true,
	"westcentralus":      true,
	"westeurope":         true,
	"westindia":          true,
	"westus":             true,
	"westus2":            true,
	"westus3":            true,
}
