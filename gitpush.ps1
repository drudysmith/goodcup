# Prompt user for commit message with default fallback
$message = Read-Host "Enter commit message (default: 'Update')"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Update"
}

# Get current branch name
$branch = git rev-parse --abbrev-ref HEAD

# Add, commit, and push
git add .
git commit -m "$message"
git push origin $branch