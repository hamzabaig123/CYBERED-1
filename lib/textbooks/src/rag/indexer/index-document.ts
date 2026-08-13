import { saveCheckpoint } from "./checkpoint";

export enum IndexingState {
    PENDING = "PENDING",
    CHUNKING = "CHUNKING",
    EMBEDDING = "EMBEDDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}

export interface IndexingJob {
    jobId: string;
    documentId: string;
    state: IndexingState;
    progress: number;
}

export class DocumentIndexer {
    public async runPipeline(job: IndexingJob): Promise<IndexingJob> {
        try {
            job.state = IndexingState.CHUNKING;
            job.progress = 25;
            await saveCheckpoint(job);

            // Chunking logic here
            job.state = IndexingState.EMBEDDING;
            job.progress = 75;
            await saveCheckpoint(job);

            // Embedding logic here
            job.state = IndexingState.COMPLETED;
            job.progress = 100;
            await saveCheckpoint(job);
            
            return job;
        } catch (error) {
            job.state = IndexingState.FAILED;
            await saveCheckpoint(job);
            throw error;
        }
    }
}
