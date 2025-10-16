#!/bin/bash

# GitHub Actions Setup Validation Script
# This script helps validate that your GitHub Secrets are configured correctly
# before running the deployment workflows.

set -e

echo "🔍 FoundryVTT Deployment Setup Validator"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation results
ERRORS=0
WARNINGS=0

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate IP address format
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        return 0
    else
        return 1
    fi
}

echo "📋 Checking Prerequisites..."
echo ""

# Check if gh CLI is installed
if command_exists gh; then
    echo -e "${GREEN}✅${NC} GitHub CLI (gh) is installed"
else
    echo -e "${RED}❌${NC} GitHub CLI (gh) is not installed"
    echo "   Install from: https://cli.github.com/"
    ERRORS=$((ERRORS + 1))
fi

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} Inside a git repository"
else
    echo -e "${RED}❌${NC} Not inside a git repository"
    ERRORS=$((ERRORS + 1))
fi

# Check if gh is authenticated
if command_exists gh; then
    if gh auth status >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} GitHub CLI is authenticated"
    else
        echo -e "${RED}❌${NC} GitHub CLI is not authenticated"
        echo "   Run: gh auth login"
        ERRORS=$((ERRORS + 1))
    fi
fi

echo ""
echo "🔐 Checking GitHub Secrets..."
echo ""

if command_exists gh && gh auth status >/dev/null 2>&1; then
    # Check if secrets exist
    SECRETS=$(gh secret list 2>/dev/null || echo "")
    
    # Check ORACLE_SSH_PRIVATE_KEY
    if echo "$SECRETS" | grep -q "ORACLE_SSH_PRIVATE_KEY"; then
        echo -e "${GREEN}✅${NC} ORACLE_SSH_PRIVATE_KEY is set"
    else
        echo -e "${RED}❌${NC} ORACLE_SSH_PRIVATE_KEY is not set"
        echo "   Set it with: gh secret set ORACLE_SSH_PRIVATE_KEY < your-key.key"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check ORACLE_HOST
    if echo "$SECRETS" | grep -q "ORACLE_HOST"; then
        echo -e "${GREEN}✅${NC} ORACLE_HOST is set"
        # We can't read the actual value, so just note it's set
    else
        echo -e "${RED}❌${NC} ORACLE_HOST is not set"
        echo "   Set it with: gh secret set ORACLE_HOST -b\"YOUR_IP_ADDRESS\""
        ERRORS=$((ERRORS + 1))
    fi
    
    # Check ORACLE_USER
    if echo "$SECRETS" | grep -q "ORACLE_USER"; then
        echo -e "${GREEN}✅${NC} ORACLE_USER is set"
    else
        echo -e "${RED}❌${NC} ORACLE_USER is not set"
        echo "   Set it with: gh secret set ORACLE_USER -b\"ubuntu\""
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️${NC}  Cannot check secrets (gh CLI not available or not authenticated)"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "📁 Checking Workflow Files..."
echo ""

WORKFLOW_DIR=".github/workflows"

if [ -d "$WORKFLOW_DIR" ]; then
    echo -e "${GREEN}✅${NC} Workflow directory exists"
    
    # Check individual workflow files
    WORKFLOWS=(
        "deploy-initial.yml"
        "deploy-update.yml"
        "deploy-rollback.yml"
        "server-management.yml"
    )
    
    for workflow in "${WORKFLOWS[@]}"; do
        if [ -f "$WORKFLOW_DIR/$workflow" ]; then
            echo -e "${GREEN}✅${NC} $workflow exists"
        else
            echo -e "${RED}❌${NC} $workflow is missing"
            ERRORS=$((ERRORS + 1))
        fi
    done
else
    echo -e "${RED}❌${NC} Workflow directory does not exist"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "📚 Checking Documentation..."
echo ""

DOC_FILES=(
    "DEPLOYMENT.md"
    ".github/README.md"
    ".github/SECRETS_TEMPLATE.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅${NC} $doc exists"
    else
        echo -e "${YELLOW}⚠️${NC}  $doc is missing"
        WARNINGS=$((WARNINGS + 1))
    fi
done

echo ""
echo "🌐 Oracle Cloud Prerequisites..."
echo ""

echo -e "${YELLOW}ℹ️${NC}  Manual verification required:"
echo "   □ Oracle Cloud account created"
echo "   □ Compute instance created and running"
echo "   □ Security List configured (ports 22, 30000)"
echo "   □ Public IP address assigned"
echo "   □ SSH key downloaded"
echo ""

echo "========================================"
echo "📊 Validation Summary"
echo "========================================"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed!${NC}"
    echo ""
    echo "You're ready to deploy. Next steps:"
    echo "1. Ensure Oracle Cloud VM is running"
    echo "2. Go to your GitHub repository Actions tab"
    echo "3. Run the 'Initial Deployment to Oracle Cloud' workflow"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    echo ""
    echo "You can proceed, but review the warnings above."
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
    fi
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi

