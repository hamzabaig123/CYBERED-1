import { IndexingJob } from "./index-document";

// Mock implementation of checkpoint storage
const checkpoints = new Map<string, IndexingJob>();

export async function saveCheckpoint(job: IndexingJob): Promise<void> {
    checkpoints.set(job.jobId, { ...job });
    // In a real application, this would write to a database or blob storage
}

export async function loadCheckpoint(jobId: string): Promise<IndexingJob | null> {
    const job = checkpoints.get(jobId);
    return job ? { ...job } : null;
}
