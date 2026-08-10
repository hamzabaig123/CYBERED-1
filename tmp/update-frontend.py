import os

filepath = "D:/CYBERED/CYBERED/artifacts/cybered/src/pages/ai-knowledge-engine.tsx"
with open(filepath, 'r') as f:
    content = f.read()

# Update FileAsset interface to include progress fields
old_iface = '''interface FileAsset {
  id: number;
  subjectId: number;
  isTextbook: boolean;
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
  virusScanStatus: string;
  processingStatus: string;
  pageCount: number | null;
  fullTextKey: string | null;
  textPreview: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}'''

new_iface = '''interface FileAsset {
  id: number;
  subjectId: number;
  isTextbook: boolean;
  storageKey: string;
  originalFilename: string;
  sizeBytes: number;
  mimeType: string;
  virusScanStatus: string;
  processingStatus: string;
  pageCount: number | null;
  fullTextKey: string | null;
  textPreview: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  stagePercent?: number;
  estimatedSecondsRemaining?: number | null;
  processingStage?: string;
}'''

if old_iface in content:
    content = content.replace(old_iface, new_iface)
    print("✓ Updated FileAsset interface")
else:
    print("⚠ FileAsset interface not found - may already be updated")

# Add STAGE_PERCENT constant after imports
stage_const = '''
// Stage-based progress estimation
const STAGE_PERCENT: Record<string, number> = {
  queued: 5,
  scanning: 15,
  extracting: 30,
  uploading_to_ai: 50,
  indexing: 70,
  done: 100,
  ready: 100,
  error: 0,
};

function formatEta(seconds: number): string {
  if (seconds < 60) return "~" + seconds + "s";
  return "~" + Math.round(seconds / 60) + "m";
}

'''

# Check if stage_const is already added
if 'const STAGE_PERCENT' not in content:
    content = content.replace(
        'import { streamExplain, type ReplyLanguage, REPLY_LANGUAGES, streamChat, streamEvaluate } from "@/lib/ai-stream";',
        'import { streamExplain, type ReplyLanguage, REPLY_LANGUAGES, streamChat, streamEvaluate } from "@/lib/ai-stream";' + stage_const
    )
    print("✓ Added STAGE_PERCENT constants")
else:
    print("✓ STAGE_PERCENT already present")

with open(filepath, 'w') as f:
    f.write(content)

print("Done! File updated successfully.")