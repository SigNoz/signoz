package cloudintegrationtypes

import (
	"github.com/SigNoz/signoz/pkg/errors"
	"github.com/SigNoz/signoz/pkg/valuer"
)

type CloudProviderRegion struct{ valuer.String }

var ErrCodeInvalidCloudRegion = errors.MustNewCode("invalid_cloud_region")
var (
	// AWS regions.
	AWSRegionAFSouth1     = CloudProviderRegion{valuer.NewString("af-south-1")}     // Africa (Cape Town).
	AWSRegionAPEast1      = CloudProviderRegion{valuer.NewString("ap-east-1")}      // Asia Pacific (Hong Kong).
	AWSRegionAPEast2      = CloudProviderRegion{valuer.NewString("ap-east-2")}      // Asia Pacific (Taipei).
	AWSRegionAPNortheast1 = CloudProviderRegion{valuer.NewString("ap-northeast-1")} // Asia Pacific (Tokyo).
	AWSRegionAPNortheast2 = CloudProviderRegion{valuer.NewString("ap-northeast-2")} // Asia Pacific (Seoul).
	AWSRegionAPNortheast3 = CloudProviderRegion{valuer.NewString("ap-northeast-3")} // Asia Pacific (Osaka).
	AWSRegionAPSouth1     = CloudProviderRegion{valuer.NewString("ap-south-1")}     // Asia Pacific (Mumbai).
	AWSRegionAPSouth2     = CloudProviderRegion{valuer.NewString("ap-south-2")}     // Asia Pacific (Hyderabad).
	AWSRegionAPSoutheast1 = CloudProviderRegion{valuer.NewString("ap-southeast-1")} // Asia Pacific (Singapore).
	AWSRegionAPSoutheast2 = CloudProviderRegion{valuer.NewString("ap-southeast-2")} // Asia Pacific (Sydney).
	AWSRegionAPSoutheast3 = CloudProviderRegion{valuer.NewString("ap-southeast-3")} // Asia Pacific (Jakarta).
	AWSRegionAPSoutheast4 = CloudProviderRegion{valuer.NewString("ap-southeast-4")} // Asia Pacific (Melbourne).
	AWSRegionAPSoutheast5 = CloudProviderRegion{valuer.NewString("ap-southeast-5")} // Asia Pacific (Malaysia).
	AWSRegionAPSoutheast6 = CloudProviderRegion{valuer.NewString("ap-southeast-6")} // Asia Pacific (New Zealand).
	AWSRegionAPSoutheast7 = CloudProviderRegion{valuer.NewString("ap-southeast-7")} // Asia Pacific (Thailand).
	AWSRegionCACentral1   = CloudProviderRegion{valuer.NewString("ca-central-1")}   // Canada (Central).
	AWSRegionCAWest1      = CloudProviderRegion{valuer.NewString("ca-west-1")}      // Canada West (Calgary).
	AWSRegionEUCentral1   = CloudProviderRegion{valuer.NewString("eu-central-1")}   // Europe (Frankfurt).
	AWSRegionEUCentral2   = CloudProviderRegion{valuer.NewString("eu-central-2")}   // Europe (Zurich).
	AWSRegionEUNorth1     = CloudProviderRegion{valuer.NewString("eu-north-1")}     // Europe (Stockholm).
	AWSRegionEUSouth1     = CloudProviderRegion{valuer.NewString("eu-south-1")}     // Europe (Milan).
	AWSRegionEUSouth2     = CloudProviderRegion{valuer.NewString("eu-south-2")}     // Europe (Spain).
	AWSRegionEUWest1      = CloudProviderRegion{valuer.NewString("eu-west-1")}      // Europe (Ireland).
	AWSRegionEUWest2      = CloudProviderRegion{valuer.NewString("eu-west-2")}      // Europe (London).
	AWSRegionEUWest3      = CloudProviderRegion{valuer.NewString("eu-west-3")}      // Europe (Paris).
	AWSRegionILCentral1   = CloudProviderRegion{valuer.NewString("il-central-1")}   // Israel (Tel Aviv).
	AWSRegionMECentral1   = CloudProviderRegion{valuer.NewString("me-central-1")}   // Middle East (UAE).
	AWSRegionMESouth1     = CloudProviderRegion{valuer.NewString("me-south-1")}     // Middle East (Bahrain).
	AWSRegionMXCentral1   = CloudProviderRegion{valuer.NewString("mx-central-1")}   // Mexico (Central).
	AWSRegionSAEast1      = CloudProviderRegion{valuer.NewString("sa-east-1")}      // South America (Sao Paulo).
	AWSRegionUSEast1      = CloudProviderRegion{valuer.NewString("us-east-1")}      // US East (N. Virginia).
	AWSRegionUSEast2      = CloudProviderRegion{valuer.NewString("us-east-2")}      // US East (Ohio).
	AWSRegionUSWest1      = CloudProviderRegion{valuer.NewString("us-west-1")}      // US West (N. California).
	AWSRegionUSWest2      = CloudProviderRegion{valuer.NewString("us-west-2")}      // US West (Oregon).

	// Azure regions.
	AzureRegionAustraliaCentral   = CloudProviderRegion{valuer.NewString("australiacentral")}   // Australia Central.
	AzureRegionAustraliaCentral2  = CloudProviderRegion{valuer.NewString("australiacentral2")}  // Australia Central 2.
	AzureRegionAustraliaEast      = CloudProviderRegion{valuer.NewString("australiaeast")}      // Australia East.
	AzureRegionAustraliaSoutheast = CloudProviderRegion{valuer.NewString("australiasoutheast")} // Australia Southeast.
	AzureRegionAustriaEast        = CloudProviderRegion{valuer.NewString("austriaeast")}        // Austria East.
	AzureRegionBelgiumCentral     = CloudProviderRegion{valuer.NewString("belgiumcentral")}     // Belgium Central.
	AzureRegionBrazilSouth        = CloudProviderRegion{valuer.NewString("brazilsouth")}        // Brazil South.
	AzureRegionBrazilSoutheast    = CloudProviderRegion{valuer.NewString("brazilsoutheast")}    // Brazil Southeast.
	AzureRegionCanadaCentral      = CloudProviderRegion{valuer.NewString("canadacentral")}      // Canada Central.
	AzureRegionCanadaEast         = CloudProviderRegion{valuer.NewString("canadaeast")}         // Canada East.
	AzureRegionCentralIndia       = CloudProviderRegion{valuer.NewString("centralindia")}       // Central India.
	AzureRegionCentralUS          = CloudProviderRegion{valuer.NewString("centralus")}          // Central US.
	AzureRegionChileCentral       = CloudProviderRegion{valuer.NewString("chilecentral")}       // Chile Central.
	AzureRegionDenmarkEast        = CloudProviderRegion{valuer.NewString("denmarkeast")}        // Denmark East.
	AzureRegionEastAsia           = CloudProviderRegion{valuer.NewString("eastasia")}           // East Asia.
	AzureRegionEastUS             = CloudProviderRegion{valuer.NewString("eastus")}             // East US.
	AzureRegionEastUS2            = CloudProviderRegion{valuer.NewString("eastus2")}            // East US 2.
	AzureRegionFranceCentral      = CloudProviderRegion{valuer.NewString("francecentral")}      // France Central.
	AzureRegionFranceSouth        = CloudProviderRegion{valuer.NewString("francesouth")}        // France South.
	AzureRegionGermanyNorth       = CloudProviderRegion{valuer.NewString("germanynorth")}       // Germany North.
	AzureRegionGermanyWestCentral = CloudProviderRegion{valuer.NewString("germanywestcentral")} // Germany West Central.
	AzureRegionIndonesiaCentral   = CloudProviderRegion{valuer.NewString("indonesiacentral")}   // Indonesia Central.
	AzureRegionIsraelCentral      = CloudProviderRegion{valuer.NewString("israelcentral")}      // Israel Central.
	AzureRegionItalyNorth         = CloudProviderRegion{valuer.NewString("italynorth")}         // Italy North.
	AzureRegionJapanEast          = CloudProviderRegion{valuer.NewString("japaneast")}          // Japan East.
	AzureRegionJapanWest          = CloudProviderRegion{valuer.NewString("japanwest")}          // Japan West.
	AzureRegionKoreaCentral       = CloudProviderRegion{valuer.NewString("koreacentral")}       // Korea Central.
	AzureRegionKoreaSouth         = CloudProviderRegion{valuer.NewString("koreasouth")}         // Korea South.
	AzureRegionMalaysiaWest       = CloudProviderRegion{valuer.NewString("malaysiawest")}       // Malaysia West.
	AzureRegionMexicoCentral      = CloudProviderRegion{valuer.NewString("mexicocentral")}      // Mexico Central.
	AzureRegionNewZealandNorth    = CloudProviderRegion{valuer.NewString("newzealandnorth")}    // New Zealand North.
	AzureRegionNorthCentralUS     = CloudProviderRegion{valuer.NewString("northcentralus")}     // North Central US.
	AzureRegionNorthEurope        = CloudProviderRegion{valuer.NewString("northeurope")}        // North Europe.
	AzureRegionNorwayEast         = CloudProviderRegion{valuer.NewString("norwayeast")}         // Norway East.
	AzureRegionNorwayWest         = CloudProviderRegion{valuer.NewString("norwaywest")}         // Norway West.
	AzureRegionPolandCentral      = CloudProviderRegion{valuer.NewString("polandcentral")}      // Poland Central.
	AzureRegionQatarCentral       = CloudProviderRegion{valuer.NewString("qatarcentral")}       // Qatar Central.
	AzureRegionSouthAfricaNorth   = CloudProviderRegion{valuer.NewString("southafricanorth")}   // South Africa North.
	AzureRegionSouthAfricaWest    = CloudProviderRegion{valuer.NewString("southafricawest")}    // South Africa West.
	AzureRegionSouthCentralUS     = CloudProviderRegion{valuer.NewString("southcentralus")}     // South Central US.
	AzureRegionSouthIndia         = CloudProviderRegion{valuer.NewString("southindia")}         // South India.
	AzureRegionSoutheastAsia      = CloudProviderRegion{valuer.NewString("southeastasia")}      // Southeast Asia.
	AzureRegionSpainCentral       = CloudProviderRegion{valuer.NewString("spaincentral")}       // Spain Central.
	AzureRegionSwedenCentral      = CloudProviderRegion{valuer.NewString("swedencentral")}      // Sweden Central.
	AzureRegionSwitzerlandNorth   = CloudProviderRegion{valuer.NewString("switzerlandnorth")}   // Switzerland North.
	AzureRegionSwitzerlandWest    = CloudProviderRegion{valuer.NewString("switzerlandwest")}    // Switzerland West.
	AzureRegionUAECentral         = CloudProviderRegion{valuer.NewString("uaecentral")}         // UAE Central.
	AzureRegionUAENorth           = CloudProviderRegion{valuer.NewString("uaenorth")}           // UAE North.
	AzureRegionUKSouth            = CloudProviderRegion{valuer.NewString("uksouth")}            // UK South.
	AzureRegionUKWest             = CloudProviderRegion{valuer.NewString("ukwest")}             // UK West.
	AzureRegionWestCentralUS      = CloudProviderRegion{valuer.NewString("westcentralus")}      // West Central US.
	AzureRegionWestEurope         = CloudProviderRegion{valuer.NewString("westeurope")}         // West Europe.
	AzureRegionWestIndia          = CloudProviderRegion{valuer.NewString("westindia")}          // West India.
	AzureRegionWestUS             = CloudProviderRegion{valuer.NewString("westus")}             // West US.
	AzureRegionWestUS2            = CloudProviderRegion{valuer.NewString("westus2")}            // West US 2.
	AzureRegionWestUS3            = CloudProviderRegion{valuer.NewString("westus3")}            // West US 3.
)

func Enum() []any {
	return []any{
		// AWS regions.
		AWSRegionAFSouth1, AWSRegionAPEast1, AWSRegionAPEast2, AWSRegionAPNortheast1, AWSRegionAPNortheast2, AWSRegionAPNortheast3,
		AWSRegionAPSouth1, AWSRegionAPSouth2, AWSRegionAPSoutheast1, AWSRegionAPSoutheast2, AWSRegionAPSoutheast3,
		AWSRegionAPSoutheast4, AWSRegionAPSoutheast5, AWSRegionAPSoutheast6, AWSRegionAPSoutheast7, AWSRegionCACentral1, AWSRegionCAWest1, AWSRegionEUCentral1, AWSRegionEUCentral2, AWSRegionEUNorth1,
		AWSRegionEUSouth1, AWSRegionEUSouth2, AWSRegionEUWest1, AWSRegionEUWest2, AWSRegionEUWest3,
		AWSRegionILCentral1, AWSRegionMECentral1, AWSRegionMESouth1, AWSRegionMXCentral1, AWSRegionSAEast1, AWSRegionUSEast1, AWSRegionUSEast2,
		AWSRegionUSWest1, AWSRegionUSWest2,
		// Azure regions.
		AzureRegionAustraliaCentral, AzureRegionAustraliaCentral2, AzureRegionAustraliaEast, AzureRegionAustraliaSoutheast,
		AzureRegionAustriaEast, AzureRegionBelgiumCentral, AzureRegionBrazilSouth, AzureRegionBrazilSoutheast,
		AzureRegionCanadaCentral, AzureRegionCanadaEast, AzureRegionCentralIndia, AzureRegionCentralUS,
		AzureRegionChileCentral, AzureRegionDenmarkEast, AzureRegionEastAsia, AzureRegionEastUS, AzureRegionEastUS2,
		AzureRegionFranceCentral, AzureRegionFranceSouth, AzureRegionGermanyNorth, AzureRegionGermanyWestCentral,
		AzureRegionIndonesiaCentral, AzureRegionIsraelCentral, AzureRegionItalyNorth, AzureRegionJapanEast, AzureRegionJapanWest,
		AzureRegionKoreaCentral, AzureRegionKoreaSouth, AzureRegionMalaysiaWest, AzureRegionMexicoCentral,
		AzureRegionNewZealandNorth, AzureRegionNorthCentralUS, AzureRegionNorthEurope, AzureRegionNorwayEast, AzureRegionNorwayWest,
		AzureRegionPolandCentral, AzureRegionQatarCentral, AzureRegionSouthAfricaNorth, AzureRegionSouthAfricaWest,
		AzureRegionSouthCentralUS, AzureRegionSouthIndia, AzureRegionSoutheastAsia, AzureRegionSpainCentral,
		AzureRegionSwedenCentral, AzureRegionSwitzerlandNorth, AzureRegionSwitzerlandWest,
		AzureRegionUAECentral, AzureRegionUAENorth, AzureRegionUKSouth, AzureRegionUKWest,
		AzureRegionWestCentralUS, AzureRegionWestEurope, AzureRegionWestIndia, AzureRegionWestUS, AzureRegionWestUS2, AzureRegionWestUS3,
	}
}

var SupportedRegions = map[CloudProviderType][]CloudProviderRegion{
	CloudProviderTypeAWS: {
		AWSRegionAFSouth1, AWSRegionAPEast1, AWSRegionAPEast2, AWSRegionAPNortheast1, AWSRegionAPNortheast2, AWSRegionAPNortheast3,
		AWSRegionAPSouth1, AWSRegionAPSouth2, AWSRegionAPSoutheast1, AWSRegionAPSoutheast2, AWSRegionAPSoutheast3,
		AWSRegionAPSoutheast4, AWSRegionAPSoutheast5, AWSRegionAPSoutheast6, AWSRegionAPSoutheast7, AWSRegionCACentral1, AWSRegionCAWest1, AWSRegionEUCentral1, AWSRegionEUCentral2, AWSRegionEUNorth1,
		AWSRegionEUSouth1, AWSRegionEUSouth2, AWSRegionEUWest1, AWSRegionEUWest2, AWSRegionEUWest3,
		AWSRegionILCentral1, AWSRegionMECentral1, AWSRegionMESouth1, AWSRegionMXCentral1, AWSRegionSAEast1, AWSRegionUSEast1, AWSRegionUSEast2,
		AWSRegionUSWest1, AWSRegionUSWest2,
	},
	CloudProviderTypeAzure: {
		AzureRegionAustraliaCentral, AzureRegionAustraliaCentral2, AzureRegionAustraliaEast, AzureRegionAustraliaSoutheast,
		AzureRegionAustriaEast, AzureRegionBelgiumCentral, AzureRegionBrazilSouth, AzureRegionBrazilSoutheast,
		AzureRegionCanadaCentral, AzureRegionCanadaEast, AzureRegionCentralIndia, AzureRegionCentralUS,
		AzureRegionChileCentral, AzureRegionDenmarkEast, AzureRegionEastAsia, AzureRegionEastUS, AzureRegionEastUS2,
		AzureRegionFranceCentral, AzureRegionFranceSouth, AzureRegionGermanyNorth, AzureRegionGermanyWestCentral,
		AzureRegionIndonesiaCentral, AzureRegionIsraelCentral, AzureRegionItalyNorth, AzureRegionJapanEast, AzureRegionJapanWest,
		AzureRegionKoreaCentral, AzureRegionKoreaSouth, AzureRegionMalaysiaWest, AzureRegionMexicoCentral,
		AzureRegionNewZealandNorth, AzureRegionNorthCentralUS, AzureRegionNorthEurope, AzureRegionNorwayEast, AzureRegionNorwayWest,
		AzureRegionPolandCentral, AzureRegionQatarCentral, AzureRegionSouthAfricaNorth, AzureRegionSouthAfricaWest,
		AzureRegionSouthCentralUS, AzureRegionSouthIndia, AzureRegionSoutheastAsia, AzureRegionSpainCentral,
		AzureRegionSwedenCentral, AzureRegionSwitzerlandNorth, AzureRegionSwitzerlandWest,
		AzureRegionUAECentral, AzureRegionUAENorth, AzureRegionUKSouth, AzureRegionUKWest,
		AzureRegionWestCentralUS, AzureRegionWestEurope, AzureRegionWestIndia, AzureRegionWestUS, AzureRegionWestUS2, AzureRegionWestUS3,
	},
}

func validateAWSRegion(region string) error {
	for _, r := range SupportedRegions[CloudProviderTypeAWS] {
		if r.StringValue() == region {
			return nil
		}
	}

	return errors.NewInvalidInputf(ErrCodeInvalidCloudRegion, "invalid AWS region: %s", region)
}
