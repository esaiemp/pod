# Enter your Airtable credentials securely
$token = Read-Host "Enter your Airtable Personal Access Token" -AsSecureString
$baseId = Read-Host "Enter your Airtable Base ID"

# Convert the secure input for the API request
$tokenPlain = [System.Net.NetworkCredential]::new("", $token).Password

$headers = @{
    Authorization = "Bearer $tokenPlain"
}

try {
    $response = Invoke-RestMethod `
        -Uri "https://api.airtable.com/v0/meta/bases/$baseId/tables" `
        -Headers $headers `
        -Method Get

    foreach ($table in $response.tables) {
        Write-Host "`nTABLE: $($table.name) [$($table.id)]" -ForegroundColor Cyan

        foreach ($field in $table.fields) {
            Write-Host "  $($field.name) [$($field.type)] - $($field.id)"
        }
    }

    # Save the schema locally
    $response.tables |
        ConvertTo-Json -Depth 30 |
        Set-Content -Path "airtable-schema.json" -Encoding UTF8

    Write-Host "`nSchema exported successfully!" -ForegroundColor Green
}
catch {
    Write-Host "Airtable request failed: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    Remove-Variable tokenPlain -ErrorAction SilentlyContinue
}
