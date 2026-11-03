#!/usr/bin/env bash
# Live smoke test for the github-kanban plugin HTTP API.
# Usage: test/verify-api.sh <base-url> [issue-number]
# The base URL is the DSH Web GUI URL printed at startup (for the desktop app,
# the URL shown in the app; for `dsh web`, the URL it prints).
set -euo pipefail
BASE="${1:?usage: test/verify-api.sh <base-url> [issue-number]}"
BASE="${BASE%/}"

fail() { echo "FAIL: $*" >&2; exit 1; }

board="$(curl -fsS "$BASE/github-kanban/api")" || fail "GET board (is the plugin installed and the app running?)"

read -r REPO ISSUE_FROM_BOARD <<<"$(echo "$board" | python3 -c '
import json, sys
b = json.load(sys.stdin)
assert isinstance(b.get("repo"), str) and "/" in b["repo"], "no repository selected: open the board once and set owner/name"
assert isinstance(b.get("issues"), list), "issues"
assert isinstance(b.get("groups"), list) and b["groups"], "groups"
assert isinstance(b.get("tasks"), list), "tasks"
assert b.get("scope") in ("mine", "all"), "board scope"
assert all(issue.get("state") == "OPEN" for issue in b["issues"]), "board must list unclosed issues only"
if b.get("scope") == "mine":
    assert all(issue.get("mine") is True for issue in b["issues"]), "mine scope must only list my issues"
print(b["repo"], b["issues"][0]["number"] if b["issues"] else "")
print("board ok: repo=%s scope=%s issues=%d groups=%d tasks=%d error=%r"
      % (b["repo"], b.get("scope"), len(b["issues"]), len(b["groups"]), len(b["tasks"]), b.get("error")), file=sys.stderr)
')"

ISSUE="${2:-$ISSUE_FROM_BOARD}"
[ -n "$ISSUE" ] || fail "no issue to check relations with (pass one explicitly)"

rel="$(curl -fsS "$BASE/github-kanban/api?issue=$ISSUE")" || fail "GET relations"
echo "$rel" | python3 -c '
import json, sys
r = json.load(sys.stdin)
nodes = r.get("nodes") or []
edges = r.get("edges") or []
assert any(n.get("role") == "focus" for n in nodes), "focus node"
numbers = {n["number"] for n in nodes}
for e in edges:
    assert e["from"] in numbers and e["to"] in numbers, "edge endpoint missing: %r" % (e,)
    assert e["kind"] in ("parent", "blocks", "relates"), e["kind"]
print("relations ok: focus=%s nodes=%d edges=%d" % (r.get("focus"), len(nodes), len(edges)))
'

# Idempotent action round-trip: assign the issue, then remove it, keeping state clean.
curl -fsS -X POST "$BASE/github-kanban/api" -H 'content-type: application/json' \
  -d "{\"action\":\"assign\",\"issue\":$ISSUE,\"group\":\"backlog\"}" \
  | python3 -c '
import json, sys
r = json.load(sys.stdin)
assert any(t.get("issueNumber") == int(sys.argv[1]) and t.get("groupId") == "backlog" for t in r.get("tasks", [])), "assigned task"
print("assign ok")
' "$ISSUE"

task_id="$(curl -fsS "$BASE/github-kanban/api" | python3 -c '
import json, sys
b = json.load(sys.stdin)
print(next(t["id"] for t in b["tasks"] if t.get("issueNumber") == int(sys.argv[1])))
' "$ISSUE")"

curl -fsS -X POST "$BASE/github-kanban/api" -H 'content-type: application/json' \
  -d "{\"action\":\"remove\",\"taskId\":\"$task_id\"}" >/dev/null
echo "remove ok"

echo "ALL CHECKS PASSED (repo: $REPO)"
