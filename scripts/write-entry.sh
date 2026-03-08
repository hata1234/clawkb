#!/bin/bash
# Usage: write-entry.sh --type report --source nightly-recon --title "深夜偵查 2026-03-08" --content "報告內容..."
# 也可以用 stdin 傳 content: echo "報告" | write-entry.sh --type report --source nightly-recon --title "..."

API="http://localhost:3500/api/entries"
TOKEN="${CLAWKB_TOKEN:-}"

TYPE="report"
SOURCE=""
TITLE=""
CONTENT=""
SUMMARY=""
STATUS="new"

while [[ $# -gt 0 ]]; do
  case $1 in
    --token) TOKEN="$2"; shift 2;;
    --type) TYPE="$2"; shift 2;;
    --source) SOURCE="$2"; shift 2;;
    --title) TITLE="$2"; shift 2;;
    --content) CONTENT="$2"; shift 2;;
    --summary) SUMMARY="$2"; shift 2;;
    --status) STATUS="$2"; shift 2;;
    *) shift;;
  esac
done

if [ -z "$TOKEN" ]; then
  echo "Error: --token is required (or set CLAWKB_TOKEN env var)"
  exit 1
fi

# Read from stdin if no content
if [ -z "$CONTENT" ] && [ ! -t 0 ]; then
  CONTENT=$(cat)
fi

if [ -z "$TITLE" ] || [ -z "$SOURCE" ]; then
  echo "Error: --title and --source are required"
  exit 1
fi

# Escape JSON
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$1"
}

JTITLE=$(json_escape "$TITLE")
JCONTENT=$(json_escape "$CONTENT")
JSUMMARY=$(json_escape "$SUMMARY")

curl -s -X POST "$API" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"type\":\"$TYPE\",\"source\":\"$SOURCE\",\"title\":$JTITLE,\"content\":$JCONTENT,\"summary\":$JSUMMARY,\"status\":\"$STATUS\"}" \
  | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'✅ Knowledge Hub entry #{d.get(\"id\",\"?\")} created')" 2>&1
