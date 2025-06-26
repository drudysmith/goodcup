param (
    [string]$Message = "Update"
)

# Get current branch name
$branch = git rev-parse --abbrev-ref HEAD

# Add, commit, and push
git add .
git commit -m "$Message"
git push origin $branch