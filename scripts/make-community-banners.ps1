Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "public\community"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$ink = [System.Drawing.Color]::FromArgb(255, 7, 6, 20)
$well = [System.Drawing.Color]::FromArgb(255, 28, 22, 48)
$gold = [System.Drawing.Color]::FromArgb(255, 212, 175, 106)
$goldHi = [System.Drawing.Color]::FromArgb(255, 243, 212, 138)
$cream = [System.Drawing.Color]::FromArgb(255, 246, 243, 236)
$mute = [System.Drawing.Color]::FromArgb(255, 168, 162, 148)
$crimson = [System.Drawing.Color]::FromArgb(255, 255, 53, 94)
$amber = [System.Drawing.Color]::FromArgb(255, 255, 176, 32)
$azure = [System.Drawing.Color]::FromArgb(255, 46, 168, 255)
$violet = [System.Drawing.Color]::FromArgb(255, 139, 92, 255)

$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $root "public\fonts\cinzel-700.ttf"))
$cinzel = $fonts.Families[0]

$markPath = Join-Path $root "public\icon-chatzy.png"
$mark = [System.Drawing.Image]::FromFile($markPath)

function Draw-Banner([int]$width, [int]$height, [string]$path) {
  $bmp = New-Object System.Drawing.Bitmap $width, $height
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($ink)

  $wellBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 0, 0),
    (New-Object System.Drawing.Point $width, 0),
    $ink,
    $well
  )
  $g.FillRectangle($wellBrush, 0, 0, $width, $height)

  $goldPen = New-Object System.Drawing.Pen $gold, 2
  $g.DrawLine($goldPen, 0, 1, $width, 1)
  $g.DrawLine($goldPen, 0, $height - 2, $width, $height - 2)

  $markSize = 88
  $markX = 28
  $markY = [int](($height - $markSize) / 2)
  $g.DrawImage($mark, $markX, $markY, $markSize, $markSize)

  $titleFont = New-Object System.Drawing.Font($cinzel, 40, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $tagFont = New-Object System.Drawing.Font($cinzel, 15, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $titleBrush = New-Object System.Drawing.SolidBrush $goldHi
  $tagBrush = New-Object System.Drawing.SolidBrush $cream
  $fmt = [System.Drawing.StringFormat]::GenericTypographic
  $textX = $markX + $markSize + 22

  function Draw-Spaced([string]$text, $font, $brush, [single]$x, [single]$y, [single]$track) {
    foreach ($ch in $text.ToCharArray()) {
      $g.DrawString($ch, $font, $brush, $x, $y, $fmt)
      $x += $g.MeasureString($ch, $font, [System.Drawing.PointF]::new(0, 0), $fmt).Width + $track
    }
    return $x
  }

  [void](Draw-Spaced "HUEPOT" $titleFont $titleBrush $textX 26 6)
  $tagX = $textX
  foreach ($word in @("Same", "price.", "Biggest", "color", "takes.")) {
    $tagX = Draw-Spaced $word $tagFont $tagBrush $tagX 80 1.4
    $tagX += 16
  }

  $coinR = 10
  $gap = 32
  $right = $width - 40
  $cy = [int]($height / 2)
  $colors = @($crimson, $amber, $azure, $violet)
  for ($i = 0; $i -lt $colors.Count; $i++) {
    $cx = $right - (($colors.Count - 1 - $i) * $gap)
    $brush = New-Object System.Drawing.SolidBrush $colors[$i]
    $g.FillEllipse($brush, $cx - $coinR, $cy - $coinR, $coinR * 2, $coinR * 2)
    $ring = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, 243, 212, 138)), 1
    $g.DrawEllipse($ring, $cx - $coinR, $cy - $coinR, $coinR * 2, $coinR * 2)
    $brush.Dispose()
    $ring.Dispose()
  }

  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  $wellBrush.Dispose()
  $goldPen.Dispose()
  $titleFont.Dispose()
  $tagFont.Dispose()
  $titleBrush.Dispose()
  $tagBrush.Dispose()
}

Draw-Banner 1072 128 (Join-Path $outDir "banner-1072x128.png")
Draw-Banner 1080 128 (Join-Path $outDir "banner-1080x128.png")
$mark.Dispose()
Write-Output "Wrote public/community/banner-1072x128.png and banner-1080x128.png"
