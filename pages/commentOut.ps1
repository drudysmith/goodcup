# Step 1: Gather all target files
$files = Get-ChildItem -Path . -Recurse -Include *.ts,*.tsx,*.js,*.jsx -File
$total = $files.Count

if ($total -eq 0) {
    Write-Host "No matching files found." -ForegroundColor Yellow
    exit
}

# Step 2: Confirm with user
Write-Host "`nFound $total files containing .ts/.tsx/.js/.jsx extensions." -ForegroundColor Cyan
$confirmation = Read-Host "Do you want to comment out all console.log/debug/warn lines in these files? (y/n)"
if ($confirmation -ne 'y') {
    Write-Host "Operation cancelled by user." -ForegroundColor Red
    exit
}

# Step 3: Process with progress bar
for ($i = 0; $i -lt $total; $i++) {
    $file = $files[$i].FullName
    $content = Get-Content $file
    $updated = $content | ForEach-Object {
    	if ($_ -match '^\s*console\.(log|debug|warn)') {
	       return "// $_"
	} else {
               return $_
    	  }
    }
    Set-Content -Path $file -Value $updated
    Write-Progress -Activity "Commenting console logs" -Status "Processing file $($i + 1) of $total" -PercentComplete (($i + 1) / $total * 100)
}

Write-Host "`n✅ Console statements commented correctly in $total files." -ForegroundColor Green