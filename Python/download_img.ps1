$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$imgDir = "c:\Users\Muxiddin\Desktop\Tugarak.uz\Img"
if (!(Test-Path $imgDir)) {
    New-Item -ItemType Directory -Force -Path $imgDir | Out-Null
}

function Process-File {
    param(
        [string]$FilePath,
        [string]$Prefix
    )
    
    $content = Get-Content -Path $FilePath -Raw -Encoding UTF8
    
    $pattern = 'src="(https://images\.unsplash\.com/[^"]+)"'
    $matches = [regex]::Matches($content, $pattern)
    
    $uniqueUrls = $matches | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    
    $i = 0
    foreach ($url in $uniqueUrls) {
        $cleanMatch = [regex]::Match($url, 'photo-([a-zA-Z0-9\-]+)')
        if ($cleanMatch.Success) {
            $filename = $cleanMatch.Groups[1].Value + ".jpg"
        } else {
            $filename = "image_$i.jpg"
            $i++
        }
        
        $savePath = Join-Path $imgDir $filename
        
        if (!(Test-Path $savePath)) {
            Write-Host "Downloading $filename..."
            try {
                Invoke-WebRequest -Uri $url -OutFile $savePath -UseBasicParsing
            } catch {
                Write-Host "Failed to download $url : $_"
            }
        }
        
        $newSrc = "$Prefix`Img/$filename"
        $content = $content.Replace($url, $newSrc)
    }
    
    Set-Content -Path $FilePath -Value $content -Encoding UTF8
}

Write-Host "Processing index.html..."
Process-File -FilePath "c:\Users\Muxiddin\Desktop\Tugarak.uz\index.html" -Prefix "./"

Write-Host "Processing Tugaraklar.html..."
Process-File -FilePath "c:\Users\Muxiddin\Desktop\Tugarak.uz\Pages\Tugaraklar.html" -Prefix "../"

Write-Host "All done!"
