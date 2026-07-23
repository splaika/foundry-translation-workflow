# =============================================================================
# SharePoint リスト プロビジョニング（PnP.PowerShell）
# レビューアプリ台帳を「Dataverse 互換」の列で作成する。
# 列名・型・選択肢値は Dataverse 移行時に 1:1 で載せ替えられるよう固定。
#
# 前提: Install-Module PnP.PowerShell ; Connect-PnPOnline -Url <site> -Interactive
# 実行: .\sharepoint-lists.ps1 -SiteUrl "https://contoso.sharepoint.com/sites/xxx"
# =============================================================================
param([Parameter(Mandatory=$true)][string]$SiteUrl)

Connect-PnPOnline -Url $SiteUrl -Interactive

# ---- Documents（文書マスタ） ----
New-PnPList -Title "Documents" -Template GenericList -OnQuickLaunch -ErrorAction SilentlyContinue
Add-PnPField -List "Documents" -DisplayName "DocId"          -InternalName "DocId"          -Type Text   -AddToDefaultView
Add-PnPField -List "Documents" -DisplayName "SourceDocxUrl"  -InternalName "SourceDocxUrl"  -Type Text
Add-PnPField -List "Documents" -DisplayName "TargetDocxUrl"  -InternalName "TargetDocxUrl"  -Type Text
Add-PnPField -List "Documents" -DisplayName "Status"         -InternalName "Status"         -Type Choice -Choices "need-review","in-review","signed"
Add-PnPField -List "Documents" -DisplayName "CheckpointId"   -InternalName "CheckpointId"   -Type Text
Add-PnPField -List "Documents" -DisplayName "ModelPin"       -InternalName "ModelPin"       -Type Text
Add-PnPField -List "Documents" -DisplayName "Reviewer"       -InternalName "Reviewer"       -Type Text
Add-PnPField -List "Documents" -DisplayName "SignedAt"       -InternalName "SignedAt"       -Type DateTime
Add-PnPField -List "Documents" -DisplayName "SegmentTotal"   -InternalName "SegmentTotal"   -Type Number
Add-PnPField -List "Documents" -DisplayName "SegmentApproved"-InternalName "SegmentApproved"-Type Number

# ---- Segments（review package 本体） ----
New-PnPList -Title "Segments" -Template GenericList -OnQuickLaunch -ErrorAction SilentlyContinue
Add-PnPField -List "Segments" -DisplayName "SegmentId"  -InternalName "SegmentId"  -Type Text -AddToDefaultView
Add-PnPField -List "Segments" -DisplayName "DocId"      -InternalName "DocId"      -Type Text -AddToDefaultView
Add-PnPField -List "Segments" -DisplayName "SortOrder"  -InternalName "SortOrder"  -Type Number
Add-PnPField -List "Segments" -DisplayName "SourceText" -InternalName "SourceText" -Type Note
Add-PnPField -List "Segments" -DisplayName "TargetDraft"-InternalName "TargetDraft"-Type Note
Add-PnPField -List "Segments" -DisplayName "FinalTarget"-InternalName "FinalTarget"-Type Note
Add-PnPField -List "Segments" -DisplayName "SegmentType"-InternalName "SegmentType"-Type Text
Add-PnPField -List "Segments" -DisplayName "QeScore"    -InternalName "QeScore"    -Type Number
Add-PnPField -List "Segments" -DisplayName "Status"     -InternalName "Status"     -Type Choice -Choices "pending","approved","rejected","edited"
Add-PnPField -List "Segments" -DisplayName "ModelPin"   -InternalName "ModelPin"   -Type Text
# 重い構造（glossaryHits/criticFlags/spans/backTranslation/provenance）は JSON 1 列に格納
Add-PnPField -List "Segments" -DisplayName "PackageJson"-InternalName "PackageJson"-Type Note

# ---- Decisions（監査・追記のみ） ----
New-PnPList -Title "Decisions" -Template GenericList -OnQuickLaunch -ErrorAction SilentlyContinue
Add-PnPField -List "Decisions" -DisplayName "SegmentId"        -InternalName "SegmentId"        -Type Text -AddToDefaultView
Add-PnPField -List "Decisions" -DisplayName "DocId"            -InternalName "DocId"            -Type Text
Add-PnPField -List "Decisions" -DisplayName "Actor"            -InternalName "Actor"            -Type Text
Add-PnPField -List "Decisions" -DisplayName "Action"           -InternalName "Action"           -Type Choice -Choices "accept","edit","reject","auto-pass"
Add-PnPField -List "Decisions" -DisplayName "BeforeText"       -InternalName "BeforeText"       -Type Note
Add-PnPField -List "Decisions" -DisplayName "AfterText"        -InternalName "AfterText"        -Type Note
Add-PnPField -List "Decisions" -DisplayName "MqmCategory"      -InternalName "MqmCategory"      -Type Text
Add-PnPField -List "Decisions" -DisplayName "MqmSeverity"      -InternalName "MqmSeverity"      -Type Text
Add-PnPField -List "Decisions" -DisplayName "Reason"           -InternalName "Reason"           -Type Note
# 用語昇格は独立 PromotionQueue リストではなく、この Boolean フラグで表現する。
# レビュアーが修正時に「用語集に昇格」を ON → Logic Apps が PromoteToGlossary=true の Decisions を
# harvest し、用語責任者の承認ゲートを経て termbase 化する（materialize したい場合の投影は harvest 側）。
Add-PnPField -List "Decisions" -DisplayName "PromoteToGlossary"-InternalName "PromoteToGlossary"-Type Boolean
Add-PnPField -List "Decisions" -DisplayName "Ts"               -InternalName "Ts"               -Type DateTime

# ---- ReviewConfig（QE 閾値・追記型で変更履歴＝Settings 監査） ----
New-PnPList -Title "ReviewConfig" -Template GenericList -OnQuickLaunch -ErrorAction SilentlyContinue
Add-PnPField -List "ReviewConfig" -DisplayName "ProjectId"      -InternalName "ProjectId"      -Type Text -AddToDefaultView
Add-PnPField -List "ReviewConfig" -DisplayName "RedMax"         -InternalName "RedMax"         -Type Number
Add-PnPField -List "ReviewConfig" -DisplayName "AmberMax"       -InternalName "AmberMax"       -Type Number
Add-PnPField -List "ReviewConfig" -DisplayName "FailClosedAxes" -InternalName "FailClosedAxes" -Type Text
Add-PnPField -List "ReviewConfig" -DisplayName "AutoPassEnabled"-InternalName "AutoPassEnabled"-Type Boolean
Add-PnPField -List "ReviewConfig" -DisplayName "ChangedBy"      -InternalName "ChangedBy"      -Type Text
Add-PnPField -List "ReviewConfig" -DisplayName "ChangedAt"      -InternalName "ChangedAt"      -Type DateTime

Write-Host "リスト作成完了。次: Decisions は削除権限を運用側で剥奪し、リスト監査(バージョン管理)をONにする。"
Write-Host "GxP: Documents/Segments/Decisions/ReviewConfig の DocId・SegmentId を業務キーとして扱う（自動IDに依存しない）。"
