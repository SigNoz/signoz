#!/bin/bash

set -o errexit

# Regular Colors
Yellow='\033[0;33m' # Yellow
Green='\033[0;32m'  # Green
NC='\033[0m'        # No Color

echo ""
echo -e "👋 Thank you for trying out SigNoz!"
echo ""
echo -e "SigNoz now installs and runs through ${Green}Foundry${NC}."
echo ""
echo -e "${Yellow}⚠️  This install script has been deprecated and is no longer maintained.${NC}"
echo -e "${Yellow}⚠️  Please see https://github.com/SigNoz/signoz/blob/main/deploy/README.md for new installation and migrations to Foundry.${NC}"
echo ""
echo ""
echo -e "Please follow the latest installation instructions here:"
echo -e "${Green}👉 https://signoz.io/docs/install/docker/${NC}"
echo ""
echo -e "🙏 Thank you!"
echo ""

exit 0
