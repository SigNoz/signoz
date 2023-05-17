package dashboards

import (
	"encoding/json"
	"io/ioutil"
	"os"

	"go.signoz.io/signoz/pkg/query-service/constants"
	"go.signoz.io/signoz/pkg/query-service/interfaces"
	"go.uber.org/zap"
)

func readCurrentDir(dir string, fm interfaces.FeatureLookup) error {
	file, err := os.Open(dir)
	if err != nil {
		zap.S().Errorf("failed opening directory: %s", err)
		return err
	}
	defer file.Close()

	list, _ := file.Readdirnames(0) // 0 to read all files and folders
	for _, filename := range list {
		zap.S().Info("Provisioning dashboard: ", filename)
		plan, err := ioutil.ReadFile(dir + "/" + filename)
		if err != nil {
			zap.S().Errorf("Creating Dashboards: Error in reading json fron file: %s\t%s", filename, err)
			continue
		}
		var data map[string]interface{}
		err = json.Unmarshal(plan, &data)
		if err != nil {
			zap.S().Errorf("Creating Dashboards: Error in unmarshalling json from file: %s\t%s", filename, err)
			continue
		}
		err = IsPostDataSane(&data)
		if err != nil {
			zap.S().Infof("Creating Dashboards: Error in file: %s\t%s", filename, err)
			continue
		}

		_, apiErr := GetDashboard(data["uuid"].(string))
		if apiErr == nil {
			zap.S().Infof("Creating Dashboards: Error in file: %s\t%s", filename, "Dashboard already present in database")
			continue
		}

		_, apiErr = CreateDashboard(data, fm)
		if apiErr != nil {
			zap.S().Errorf("Creating Dashboards: Error in file: %s\t%s", filename, apiErr.Err)
			continue
		}

	}
	return nil
}

func LoadDashboardFiles(fm interfaces.FeatureLookup) error {
	dashboardsPath := constants.GetOrDefaultEnv("DASHBOARDS_PATH", "./config/dashboards")
	return readCurrentDir(dashboardsPath, fm)
}
