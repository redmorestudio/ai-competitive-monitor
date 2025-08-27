#!/bin/bash

# Helper script to trigger GitHub Actions workflows
# Usage: ./trigger-workflow.sh [workflow-name]

# Load GitHub token
if [ -f ".env.local" ]; then
    export $(grep GITHUB_TOKEN .env.local | xargs)
fi

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GITHUB_TOKEN not found in .env.local"
    exit 1
fi

REPO="redmorestudio/ai-competitive-monitor"

# If no argument, list available workflows
if [ $# -eq 0 ]; then
    echo "📋 Available workflows:"
    curl -s -H "Authorization: token $GITHUB_TOKEN" \
        "https://api.github.com/repos/$REPO/actions/workflows" | \
        jq -r '.workflows[] | select(.state=="active") | "  \(.id): \(.name)"'
    echo ""
    echo "Usage: $0 <workflow_id>"
    echo "Example: $0 170431773  # Triggers Full Monitor Pipeline"
    exit 0
fi

WORKFLOW_ID=$1

# Trigger the workflow
echo "🚀 Triggering workflow $WORKFLOW_ID..."

RESPONSE=$(curl -s -X POST \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW_ID/dispatches" \
    -d '{"ref":"main"}')

if [ -z "$RESPONSE" ]; then
    echo "✅ Workflow trigger request sent successfully!"
    echo "Check status at: https://github.com/$REPO/actions"
else
    echo "❌ Error triggering workflow:"
    echo "$RESPONSE"
fi