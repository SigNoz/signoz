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

	// GCP regions.
	GCPRegionAfricaSouth1        = CloudProviderRegion{valuer.NewString("africa-south1")}        // Johannesburg, South Africa. Africa.
	GCPRegionAsiaEast1           = CloudProviderRegion{valuer.NewString("asia-east1")}           // Changhua County, Taiwan. APAC.
	GCPRegionAsiaEast2           = CloudProviderRegion{valuer.NewString("asia-east2")}           // Hong Kong. APAC.
	GCPRegionAsiaNortheast1      = CloudProviderRegion{valuer.NewString("asia-northeast1")}      // Tokyo, Japan. APAC.
	GCPRegionAsiaNortheast2      = CloudProviderRegion{valuer.NewString("asia-northeast2")}      // Osaka, Japan. APAC.
	GCPRegionAsiaNortheast3      = CloudProviderRegion{valuer.NewString("asia-northeast3")}      // Seoul, South Korea. APAC.
	GCPRegionAsiaSouth1          = CloudProviderRegion{valuer.NewString("asia-south1")}          // Mumbai, India. APAC.
	GCPRegionAsiaSouth2          = CloudProviderRegion{valuer.NewString("asia-south2")}          // Delhi, India. APAC.
	GCPRegionAsiaSoutheast1      = CloudProviderRegion{valuer.NewString("asia-southeast1")}      // Jurong West, Singapore. APAC.
	GCPRegionAsiaSoutheast2      = CloudProviderRegion{valuer.NewString("asia-southeast2")}      // Jakarta, Indonesia. APAC.
	GCPRegionAsiaSoutheast3      = CloudProviderRegion{valuer.NewString("asia-southeast3")}      // Bangkok, Thailand. APAC.
	GCPRegionAustraliaSoutheast1 = CloudProviderRegion{valuer.NewString("australia-southeast1")} // Sydney, Australia. APAC.
	GCPRegionAustraliaSoutheast2 = CloudProviderRegion{valuer.NewString("australia-southeast2")} // Melbourne, Australia. APAC.
	GCPRegionEuropeCentral2      = CloudProviderRegion{valuer.NewString("europe-central2")}      // Warsaw, Poland. Europe.
	GCPRegionEuropeNorth1        = CloudProviderRegion{valuer.NewString("europe-north1")}        // Hamina, Finland. Europe.
	GCPRegionEuropeNorth2        = CloudProviderRegion{valuer.NewString("europe-north2")}        // Stockholm, Sweden. Europe.
	GCPRegionEuropeSouthwest1    = CloudProviderRegion{valuer.NewString("europe-southwest1")}    // Madrid, Spain. Europe.
	GCPRegionEuropeWest1         = CloudProviderRegion{valuer.NewString("europe-west1")}         // St. Ghislain, Belgium. Europe.
	GCPRegionEuropeWest2         = CloudProviderRegion{valuer.NewString("europe-west2")}         // London, England. Europe.
	GCPRegionEuropeWest3         = CloudProviderRegion{valuer.NewString("europe-west3")}         // Frankfurt, Germany. Europe.
	GCPRegionEuropeWest4         = CloudProviderRegion{valuer.NewString("europe-west4")}         // Eemshaven, Netherlands. Europe.
	GCPRegionEuropeWest6         = CloudProviderRegion{valuer.NewString("europe-west6")}         // Zurich, Switzerland. Europe.
	GCPRegionEuropeWest8         = CloudProviderRegion{valuer.NewString("europe-west8")}         // Milan, Italy. Europe.
	GCPRegionEuropeWest9         = CloudProviderRegion{valuer.NewString("europe-west9")}         // Paris, France. Europe.
	GCPRegionEuropeWest10        = CloudProviderRegion{valuer.NewString("europe-west10")}        // Berlin, Germany. Europe.
	GCPRegionEuropeWest12        = CloudProviderRegion{valuer.NewString("europe-west12")}        // Turin, Italy. Europe.
	GCPRegionMECentral1          = CloudProviderRegion{valuer.NewString("me-central1")}          // Doha, Qatar. Middle East.
	GCPRegionMECentral2          = CloudProviderRegion{valuer.NewString("me-central2")}          // Dammam, Saudi Arabia. Middle East.
	GCPRegionMEWest1             = CloudProviderRegion{valuer.NewString("me-west1")}             // Tel Aviv, Israel. Middle East.
	GCPRegionNorthamericaNortheast1 = CloudProviderRegion{valuer.NewString("northamerica-northeast1")} // Montréal, Québec, Canada. North America.
	GCPRegionNorthamericaNortheast2 = CloudProviderRegion{valuer.NewString("northamerica-northeast2")} // Toronto, Ontario, Canada. North America.
	GCPRegionNorthamericaSouth1     = CloudProviderRegion{valuer.NewString("northamerica-south1")}     // Querétaro, Mexico. North America.
	GCPRegionSouthamericaEast1   = CloudProviderRegion{valuer.NewString("southamerica-east1")}   // Osasco, São Paulo, Brazil. South America.
	GCPRegionSouthamericaWest1   = CloudProviderRegion{valuer.NewString("southamerica-west1")}   // Santiago, Chile. South America.
	GCPRegionUSCentral1          = CloudProviderRegion{valuer.NewString("us-central1")}          // Council Bluffs, Iowa. North America.
	GCPRegionUSEast1             = CloudProviderRegion{valuer.NewString("us-east1")}             // Moncks Corner, South Carolina. North America.
	GCPRegionUSEast4             = CloudProviderRegion{valuer.NewString("us-east4")}             // Ashburn, Virginia. North America.
	GCPRegionUSEast5             = CloudProviderRegion{valuer.NewString("us-east5")}             // Columbus, Ohio. North America.
	GCPRegionUSSouth1            = CloudProviderRegion{valuer.NewString("us-south1")}            // Dallas, Texas. North America.
	GCPRegionUSWest1             = CloudProviderRegion{valuer.NewString("us-west1")}             // The Dalles, Oregon. North America.
	GCPRegionUSWest2             = CloudProviderRegion{valuer.NewString("us-west2")}             // Los Angeles, California. North America.
	GCPRegionUSWest3             = CloudProviderRegion{valuer.NewString("us-west3")}             // Salt Lake City, Utah. North America.
	GCPRegionUSWest4             = CloudProviderRegion{valuer.NewString("us-west4")}             // Las Vegas, Nevada. North America.
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
		// GCP regions.
		GCPRegionAfricaSouth1, GCPRegionAsiaEast1, GCPRegionAsiaEast2, GCPRegionAsiaNortheast1, GCPRegionAsiaNortheast2, GCPRegionAsiaNortheast3,
		GCPRegionAsiaSouth1, GCPRegionAsiaSouth2, GCPRegionAsiaSoutheast1, GCPRegionAsiaSoutheast2, GCPRegionAsiaSoutheast3,
		GCPRegionAustraliaSoutheast1, GCPRegionAustraliaSoutheast2,
		GCPRegionEuropeCentral2, GCPRegionEuropeNorth1, GCPRegionEuropeNorth2, GCPRegionEuropeSouthwest1,
		GCPRegionEuropeWest1, GCPRegionEuropeWest2, GCPRegionEuropeWest3, GCPRegionEuropeWest4, GCPRegionEuropeWest6,
		GCPRegionEuropeWest8, GCPRegionEuropeWest9, GCPRegionEuropeWest10, GCPRegionEuropeWest12,
		GCPRegionMECentral1, GCPRegionMECentral2, GCPRegionMEWest1,
		GCPRegionNorthamericaNortheast1, GCPRegionNorthamericaNortheast2, GCPRegionNorthamericaSouth1,
		GCPRegionSouthamericaEast1, GCPRegionSouthamericaWest1,
		GCPRegionUSCentral1, GCPRegionUSEast1, GCPRegionUSEast4, GCPRegionUSEast5, GCPRegionUSSouth1,
		GCPRegionUSWest1, GCPRegionUSWest2, GCPRegionUSWest3, GCPRegionUSWest4,
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
	CloudProviderTypeGCP: {
		GCPRegionAfricaSouth1, GCPRegionAsiaEast1, GCPRegionAsiaEast2, GCPRegionAsiaNortheast1, GCPRegionAsiaNortheast2, GCPRegionAsiaNortheast3,
		GCPRegionAsiaSouth1, GCPRegionAsiaSouth2, GCPRegionAsiaSoutheast1, GCPRegionAsiaSoutheast2, GCPRegionAsiaSoutheast3,
		GCPRegionAustraliaSoutheast1, GCPRegionAustraliaSoutheast2,
		GCPRegionEuropeCentral2, GCPRegionEuropeNorth1, GCPRegionEuropeNorth2, GCPRegionEuropeSouthwest1,
		GCPRegionEuropeWest1, GCPRegionEuropeWest2, GCPRegionEuropeWest3, GCPRegionEuropeWest4, GCPRegionEuropeWest6,
		GCPRegionEuropeWest8, GCPRegionEuropeWest9, GCPRegionEuropeWest10, GCPRegionEuropeWest12,
		GCPRegionMECentral1, GCPRegionMECentral2, GCPRegionMEWest1,
		GCPRegionNorthamericaNortheast1, GCPRegionNorthamericaNortheast2, GCPRegionNorthamericaSouth1,
		GCPRegionSouthamericaEast1, GCPRegionSouthamericaWest1,
		GCPRegionUSCentral1, GCPRegionUSEast1, GCPRegionUSEast4, GCPRegionUSEast5, GCPRegionUSSouth1,
		GCPRegionUSWest1, GCPRegionUSWest2, GCPRegionUSWest3, GCPRegionUSWest4,
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

func validateAzureRegion(region string) error {
	for _, r := range SupportedRegions[CloudProviderTypeAzure] {
		if r.StringValue() == region {
			return nil
		}
	}

	return errors.NewInvalidInputf(ErrCodeInvalidCloudRegion, "invalid Azure region: %s", region)
}

func validateGCPRegion(region string) error {
	for _, r := range SupportedRegions[CloudProviderTypeGCP] {
		if r.StringValue() == region {
			return nil
		}
	}

	return errors.NewInvalidInputf(ErrCodeInvalidCloudRegion, "invalid GCP region: %s", region)
}
