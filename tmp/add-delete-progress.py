filepath = "D:/CYBERED/CYBERED/artifacts/cybered/src/pages/ai-knowledge-engine.tsx"

with open(filepath, 'r') as f:
    content = f.read()

# Add delete mutation + progress bar to the asset rendering section
old_asset_section = '''            {assets.map((asset) => {
              const assetStatus = getAssetStatus(asset);
              return (
                <div key={asset.id} className="border border-border bg-background/40 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <Badge variant={assetStatus.variant} className="text-[8px] font-mono">
                      {assetStatus.label}
                    </Badge>
                  </div>
                  <div className="flex-1 min-h-0">
                    <h3 className="font-mono text-xs font-bold truncate">
                      {asset.originalFilename.replace(/\\.pdf$/i, "")}
                    </h3>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {formatBytes(asset.sizeBytes)} · {asset.pageCount ? `${asset.pageCount} pgs` : "—"}
                    </p>
                    {asset.textPreview && (
                      <p className="font-sans text-[10px] text-muted-foreground mt-1.5 line-clamp-2 opacity-70">
                        {asset.textPreview.slice(0, 140)}...
                      </p>
                    )}
                    {asset.errorMessage && (
                      <p className="font-mono text-[9px] text-rose-400 mt-1">{asset.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-2 border-t border-border">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[9px] h-7"
                      disabled={asset.processingStatus !== "done"}
                    >
                      <Link href={`/subjects/${subjectId}/books/${asset.id}`}>
                        <Eye className="mr-1 h-2.5 w-2.5" /> View
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}'''

new_asset_section = '''            {assets.map((asset) => {
              const assetStatus = getAssetStatus(asset);
              const stagePercent = asset.stagePercent ?? STAGE_PERCENT[asset.processingStatus] ?? 0;
              const isProcessing = asset.processingStatus !== "done" && asset.processingStatus !== "error";
              return (
                <div key={asset.id} className="border border-border bg-background/40 p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <FileText className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <Badge variant={assetStatus.variant} className="text-[8px] font-mono">
                      {assetStatus.label}
                    </Badge>
                  </div>
                  <div className="flex-1 min-h-0">
                    <h3 className="font-mono text-xs font-bold truncate">
                      {asset.originalFilename.replace(/\\.pdf$/i, "")}
                    </h3>
                    <p className="font-mono text-[9px] text-muted-foreground mt-0.5">
                      {formatBytes(asset.sizeBytes)} · {asset.pageCount ? `${asset.pageCount} pgs` : "—"}
                    </p>
                    {asset.textPreview && (
                      <p className="font-sans text-[10px] text-muted-foreground mt-1.5 line-clamp-2 opacity-70">
                        {asset.textPreview.slice(0, 140)}...
                      </p>
                    )}
                    {asset.errorMessage && (
                      <p className="font-mono text-[9px] text-rose-400 mt-1">{asset.errorMessage}</p>
                    )}
                    {isProcessing && (
                      <div className="mt-1.5 space-y-1">
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${stagePercent}%` }} />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
                          <span>{stagePercent}% — {asset.processingStage ?? asset.processingStatus}</span>
                          {asset.estimatedSecondsRemaining != null && asset.estimatedSecondsRemaining > 0 && (
                            <span>ETA {formatEta(asset.estimatedSecondsRemaining)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 pt-2 border-t border-border">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[9px] h-7"
                      disabled={asset.processingStatus !== "done"}
                    >
                      <Link href={`/subjects/${subjectId}/books/${asset.id}`}>
                        <Eye className="mr-1 h-2.5 w-2.5" /> View
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 text-rose-400 hover:bg-rose-400/10"
                      onClick={async () => {
                        if (!confirm(`Delete ${asset.originalFilename}? This can't be undone.`)) return;
                        try {
                          const res = await fetch(`/api/files/${asset.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Failed to delete");
                          toast({ title: "Deleted", description: `${asset.originalFilename} removed.` });
                          refetchAssets();
                        } catch (e) {
                          toast({ title: "Delete failed", description: (e as Error).message, variant: "destructive" });
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-2.5 w-2.5" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })}'''

if old_asset_section in content:
    content = content.replace(old_asset_section, new_asset_section)
    print("✓ Added delete button and progress bar to asset rendering")
else:
    print("⚠ Asset rendering section not found exactly - trying partial match")
    # Try to just replace the key part
    if 'const assetStatus = getAssetStatus(asset);' in content:
        print("Found assetStatus line, but full block match failed")
    else:
        print("Content doesn't match - file may have been modified")

with open(filepath, 'w') as f:
    f.write(content)

print("Done!")