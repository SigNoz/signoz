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

// List of all valid cloud regions for Microsoft Azure
var ValidAzureRegions = map[string]bool{
	"australiacentral":   true, // Australia Central
	"australiacentral2":  true, // Australia Central 2
	"australiaeast":      true, // Australia East
	"australiasoutheast": true, // Australia Southeast
	"austriaeast":        true, // Austria East
	"belgiumcentral":     true, // Belgium Central
	"brazilsouth":        true, // Brazil South
	"brazilsoutheast":    true, // Brazil Southeast
	"canadacentral":      true, // Canada Central
	"canadaeast":         true, // Canada East
	"centralindia":       true, // Central India
	"centralus":          true, // Central US
	"chilecentral":       true, // Chile Central
	"denmarkeast":        true, // Denmark East
	"eastasia":           true, // East Asia
	"eastus":             true, // East US
	"eastus2":            true, // East US 2
	"francecentral":      true, // France Central
	"francesouth":        true, // France South
	"germanynorth":       true, // Germany North
	"germanywestcentral": true, // Germany West Central
	"indonesiacentral":   true, // Indonesia Central
	"israelcentral":      true, // Israel Central
	"italynorth":         true, // Italy North
	"japaneast":          true, // Japan East
	"japanwest":          true, // Japan West
	"koreacentral":       true, // Korea Central
	"koreasouth":         true, // Korea South
	"malaysiawest":       true, // Malaysia West
	"mexicocentral":      true, // Mexico Central
	"newzealandnorth":    true, // New Zealand North
	"northcentralus":     true, // North Central US
	"northeurope":        true, // North Europe
	"norwayeast":         true, // Norway East
	"norwaywest":         true, // Norway West
	"polandcentral":      true, // Poland Central
	"qatarcentral":       true, // Qatar Central
	"southafricanorth":   true, // South Africa North
	"southafricawest":    true, // South Africa West
	"southcentralus":     true, // South Central US
	"southindia":         true, // South India
	"southeastasia":      true, // Southeast Asia
	"spaincentral":       true, // Spain Central
	"swedencentral":      true, // Sweden Central
	"switzerlandnorth":   true, // Switzerland North
	"switzerlandwest":    true, // Switzerland West
	"uaecentral":         true, // UAE Central
	"uaenorth":           true, // UAE North
	"uksouth":            true, // UK South
	"ukwest":             true, // UK West
	"westcentralus":      true, // West Central US
	"westeurope":         true, // West Europe
	"westindia":          true, // West India
	"westus":             true, // West US
	"westus2":            true, // West US 2
	"westus3":            true, // West US 3
}
