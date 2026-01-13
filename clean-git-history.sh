#!/bin/bash
# Script to remove secrets from git history
# WARNING: This rewrites git history. Make sure you have a backup!

set -e

echo "🔒 Cleaning git history to remove secrets..."
echo "⚠️  This will rewrite git history. Make sure you have a backup!"
echo ""

# Files that contained secrets (already deleted, but need to remove from history)
SECRET_FILES=".env.bak SETUP.md FIX_ENV.md QUICK_FIX.md REQUIREMENTS_FOR_TESTING.md SETUP_GUIDE.md setup-shopify-credentials.sh"

# Remove these files from all commits in history
echo "Removing secret files from git history..."
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch $SECRET_FILES 2>/dev/null || true" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up backup refs
echo ""
echo "Cleaning up backup refs..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

# Force garbage collection
echo "Running garbage collection..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "⚠️  IMPORTANT: You need to force push to update remote:"
echo "   git push --force origin main"
echo ""
echo "⚠️  If others are working on this repo, coordinate with them first!"

