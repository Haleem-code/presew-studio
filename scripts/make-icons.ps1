Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\CLASSIC\.gemini\antigravity-ide\brain\70d989d7-d8f4-482e-99ce-f005079da59c\presew_editorial_logo_1792661417672.jpg"
if (-not (Test-Path $srcPath)) {
    Write-Error "Source image not found: $srcPath"
    exit 1
}

$srcImg = [System.Drawing.Image]::FromFile($srcPath)

function Resize-Image($destPath, $w, $h) {
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $destPath (${w}x${h})"
}

$base = "C:\Users\CLASSIC\Desktop\workspace\pre-sew\presew\public\assets"
Resize-Image (Join-Path $base "logo.png") 1024 1024
Resize-Image (Join-Path $base "app-icon-512.png") 512 512
Resize-Image (Join-Path $base "icon-512.png") 512 512
Resize-Image (Join-Path $base "app-icon-192.png") 192 192
Resize-Image (Join-Path $base "icon-192.png") 192 192
Resize-Image (Join-Path $base "apple-touch-icon.png") 180 180
Resize-Image (Join-Path $base "favicon-32.png") 32 32

$favPath = Join-Path $base "favicon-32.png"
$favBytes = [System.IO.File]::ReadAllBytes($favPath)
$icoHeader = [byte[]]@(0, 0, 1, 0, 1, 0, 32, 32, 0, 0, 1, 0, 32, 0, ($favBytes.Length -band 255), (($favBytes.Length -shr 8) -band 255), (($favBytes.Length -shr 16) -band 255), (($favBytes.Length -shr 24) -band 255), 22, 0, 0, 0)
$icoBytes = $icoHeader + $favBytes
[System.IO.File]::WriteAllBytes("C:\Users\CLASSIC\Desktop\workspace\pre-sew\presew\public\favicon.ico", $icoBytes)
Write-Host "Created public/favicon.ico"

$srcImg.Dispose()
