#!/bin/bash
echo "=== Lint: Duplicate const/let declarations ==="
for file in *.html lib/*.js; do
  if [ -f "$file" ]; then
    # Find duplicate top-level const/let declarations
    grep -E '^\s*(const|let)\s+\w+' "$file" | sort | uniq -d | while read line; do
      identifier=$(echo "$line" | grep -oE '\w+' | head -1)
      echo "  $file: '$identifier' declared multiple times"
      grep -n "^\s*\(const\|let\)\s*$identifier" "$file"
    done
  fi
done

echo ""
echo "=== Lint: Script loading order ==="
for file in *.html; do
  if [ -f "$file" ]; then
    # Find auth.js loads to check what comes before it
    if grep -q 'lib/auth.js' "$file"; then
      echo "  $file:"
      # Show all script tags
      grep -n '<script' "$file" | grep -E '(supabase|auth\.js|constants\.js)' | head -10
    fi
  fi
done
