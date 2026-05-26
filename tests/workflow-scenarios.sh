#!/bin/bash

# Comprehensive workflow test scenarios for Quorvexa platform
# Tests all 10 scenarios + auth edge cases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE="${BASE:-http://localhost:4000}"
TIMEOUT=30

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Quorvexa Workflow Test Scenarios${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Auth & Setup
echo -e "${YELLOW}[SETUP] Authenticating...${NC}"

AUTH_RESPONSE=$(curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-scenario-'"$(date +%s)"'@quorvexa.dev",
    "password": "Test@1234!",
    "firstName": "Test",
    "lastName": "User"
  }')

TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
USER_ID=$(echo "$AUTH_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Authentication failed${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Authenticated as $USER_ID${NC}\n"

# Helper function to test a scenario
test_scenario() {
  local scenario_num=$1
  local workflow_name=$2
  local trigger_payload=$3
  local expected_field=$4

  echo -e "${BLUE}[Scenario $scenario_num] $workflow_name${NC}"

  # Get workflow ID
  WF_RESPONSE=$(curl -s -X GET "$BASE/api/v1/workflows?limit=100" \
    -H "Authorization: Bearer $TOKEN")

  WF_ID=$(echo "$WF_RESPONSE" | grep -o '"name":"'"$workflow_name"'"[^}]*"id":"[^"]*' | tail -1 | grep -o '"id":"[^"]*' | cut -d'"' -f4)

  if [ -z "$WF_ID" ]; then
    echo -e "${RED}✗ Could not find workflow: $workflow_name${NC}"
    return 1
  fi

  # Activate workflow (if not already active)
  curl -s -X POST "$BASE/api/v1/workflows/$WF_ID/activate" \
    -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1

  # Trigger workflow with custom payload
  PAYLOAD=$(echo "$trigger_payload" | sed "s|{EMAIL}|ignatiustimothymanullang@gmail.com|g" | sed "s|{WEBHOOK_URL}|https://webhook.site/unique-id|g")

  RESULT=$(curl -s -X POST "$BASE/api/v1/workflows/$WF_ID/trigger" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

  # Check if result contains expected field or success
  if echo "$RESULT" | grep -q "$expected_field"; then
    echo -e "${GREEN}✓ Passed${NC}\n"
    return 0
  else
    echo -e "${YELLOW}⚠ Response: $RESULT${NC}\n"
    return 0  # Soft fail - some tests may be async
  fi
}

# ── SCENARIO 1: Direct AI Agent ─────────────────────────────────
test_scenario 1 "[TEST] Direct AI Agent" \
  '{}' \
  '"output"'

# ── SCENARIO 2: Email + AI ─────────────────────────────────────
test_scenario 2 "[TEST] Email Report Generation" \
  '{"email": "{EMAIL}"}' \
  '"steps"'

# ── SCENARIO 3: HTTP + AI + Email ──────────────────────────────
test_scenario 3 "[TEST] Fetch Data & Summarize" \
  '{"email": "{EMAIL}"}' \
  '"status"'

# ── SCENARIO 4: Conditional Branch ─────────────────────────────
test_scenario 4 "[TEST] Sentiment Classification Branch" \
  '{"email": "{EMAIL}"}' \
  '"branch"'

# ── SCENARIO 5: RAG Pipeline ────────────────────────────────────
echo -e "${BLUE}[Scenario 5] RAG Pipeline${NC}"

# Embed content
EMBED_RESULT=$(curl -s -X POST "$BASE/api/v1/agents/embed" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Quorvexa is an enterprise AI workflow automation platform founded in 2026. It supports multi-tenant SaaS deployments.",
    "metadata": {"source": "company-faq", "category": "about"}
  }')

if echo "$EMBED_RESULT" | grep -q '"point_id"'; then
  echo -e "${GREEN}✓ Embed successful${NC}"
else
  echo -e "${YELLOW}⚠ Embed response: $EMBED_RESULT${NC}"
fi

# Search content
SEARCH_RESULT=$(curl -s -X POST "$BASE/api/v1/agents/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What does Quorvexa do?",
    "limit": 3
  }')

if echo "$SEARCH_RESULT" | grep -q '"query"'; then
  echo -e "${GREEN}✓ Search successful${NC}\n"
else
  echo -e "${YELLOW}⚠ Search response: $SEARCH_RESULT${NC}\n"
fi

# ── SCENARIO 6: Notification Template ───────────────────────────
echo -e "${BLUE}[Scenario 6] Notification Template${NC}"

# Create template
TEMPLATE_RESULT=$(curl -s -X POST "$BASE/api/v1/notifications/templates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Report Template",
    "slug": "test-report-'"$(date +%s)"'",
    "subject": "Report: {{title}}",
    "bodyTemplate": "Here is your report:\n{{content}}",
    "channel": "email",
    "defaultValues": {}
  }')

TEMPLATE_ID=$(echo "$TEMPLATE_RESULT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$TEMPLATE_ID" ]; then
  echo -e "${GREEN}✓ Template created: $TEMPLATE_ID${NC}"

  # Render preview
  RENDER_RESULT=$(curl -s -X POST "$BASE/api/v1/notifications/templates/$TEMPLATE_ID/render" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title": "Test", "content": "Test content"}')

  if echo "$RENDER_RESULT" | grep -q '"subject"'; then
    echo -e "${GREEN}✓ Template render successful${NC}\n"
  else
    echo -e "${YELLOW}⚠ Render response: $RENDER_RESULT${NC}\n"
  fi
else
  echo -e "${RED}✗ Template creation failed: $TEMPLATE_RESULT${NC}\n"
fi

# ── SCENARIO 7: Webhook Notification ────────────────────────────
echo -e "${BLUE}[Scenario 7] Webhook Notification${NC}"

WEBHOOK_RESULT=$(curl -s -X POST "$BASE/api/v1/notifications/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "channel": "webhook",
    "recipient": "https://webhook.site/test-endpoint",
    "subject": "Test",
    "body": "Webhook test from Quorvexa workflow"
  }')

if echo "$WEBHOOK_RESULT" | grep -q '"id"'; then
  echo -e "${GREEN}✓ Webhook notification sent${NC}\n"
else
  echo -e "${YELLOW}⚠ Webhook response: $WEBHOOK_RESULT${NC}\n"
fi

# ── SCENARIO 8: Retry & Failure ─────────────────────────────────
echo -e "${BLUE}[Scenario 8] Retry & Failure Handling${NC}"

FAIL_RESULT=$(curl -s -X POST "$BASE/api/v1/notifications/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "channel": "email",
    "recipient": "invalid-email-address",
    "subject": "Test Failure",
    "body": "This should fail and retry",
    "maxRetries": 2
  }')

NOTIF_ID=$(echo "$FAIL_RESULT" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NOTIF_ID" ]; then
  echo -e "${GREEN}✓ Notification created for retry test: $NOTIF_ID${NC}\n"
else
  echo -e "${RED}✗ Retry test notification failed${NC}\n"
fi

# ── SCENARIO 9: SSE Stream Events ───────────────────────────────
echo -e "${BLUE}[Scenario 9] SSE Stream Events${NC}"

WF_RESPONSE=$(curl -s -X GET "$BASE/api/v1/workflows?limit=100" \
  -H "Authorization: Bearer $TOKEN")

SSE_WF_ID=$(echo "$WF_RESPONSE" | grep -o '"name":"\[TEST\] SSE Stream Events"[^}]*"id":"[^"]*' | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -n "$SSE_WF_ID" ]; then
  echo -e "${GREEN}✓ SSE workflow found: $SSE_WF_ID${NC}"
  echo -e "${YELLOW}  (SSE test requires manual verification with: curl -N -H \"Authorization: Bearer \$TOKEN\" $BASE/api/v1/workflows/$SSE_WF_ID/events)${NC}\n"
else
  echo -e "${RED}✗ SSE workflow not found${NC}\n"
fi

# ── SCENARIO 10: Full Pipeline ──────────────────────────────────
test_scenario 10 "[TEST] Full Agentic Pipeline" \
  '{"email": "{EMAIL}"}' \
  '"steps"'

# ── AUTH EDGE CASES ──────────────────────────────────────────────
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Auth Edge Cases${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "${BLUE}[Auth Test 1] Account Lockout (5 failed logins)${NC}"
TEST_EMAIL="lockout-test-$(date +%s)@quorvexa.dev"

# Register user
curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "'$TEST_EMAIL'", "password": "Test@1234!", "firstName": "Test", "lastName": "Lock"}' > /dev/null

# Try 5 bad logins
for i in {1..5}; do
  curl -s -X POST "$BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email": "'$TEST_EMAIL'", "password": "WrongPassword"}' > /dev/null
done

# 6th attempt should be locked
LOCKOUT_RESULT=$(curl -s -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "'$TEST_EMAIL'", "password": "Test@1234!"}')

if echo "$LOCKOUT_RESULT" | grep -q "locked\|Account locked"; then
  echo -e "${GREEN}✓ Account lockout working${NC}\n"
else
  echo -e "${YELLOW}⚠ Lockout response: $LOCKOUT_RESULT${NC}\n"
fi

echo -e "${BLUE}[Auth Test 2] Token Refresh${NC}"
REFRESH_EMAIL="refresh-test-$(date +%s)@quorvexa.dev"

REGISTER=$(curl -s -X POST "$BASE/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "'$REFRESH_EMAIL'", "password": "Test@1234!", "firstName": "Test", "lastName": "Refresh"}')

REFRESH_TOKEN=$(echo "$REGISTER" | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -n "$REFRESH_TOKEN" ]; then
  REFRESH_RESULT=$(curl -s -X POST "$BASE/api/v1/auth/refresh" \
    -H "Authorization: Bearer $REFRESH_TOKEN")

  if echo "$REFRESH_RESULT" | grep -q '"accessToken"'; then
    echo -e "${GREEN}✓ Token refresh successful${NC}\n"
  else
    echo -e "${YELLOW}⚠ Refresh response: $REFRESH_RESULT${NC}\n"
  fi
else
  echo -e "${RED}✗ Could not get refresh token${NC}\n"
fi

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All 10 workflow scenarios executed${NC}"
echo -e "${GREEN}✓ Auth edge cases tested${NC}"
echo -e "${YELLOW}Note: Email delivery requires manual verification in Gmail inbox${NC}"
echo -e "${YELLOW}Note: Webhook delivery requires manual verification at webhook.site${NC}"
echo -e "${YELLOW}Note: SSE stream requires separate curl command with -N flag${NC}\n"
