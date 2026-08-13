export interface ExamTopic {
    name: string;
    frequencyInPastExams: number;
    difficultyWeight: number;
}

export class ExamAnalyzer {
    public calculateImportanceScore(topic: ExamTopic): number {
        // Simple weighted score: 70% frequency, 30% difficulty
        const normalizedFrequency = Math.min(topic.frequencyInPastExams / 10, 1.0);
        const normalizedDifficulty = Math.min(topic.difficultyWeight / 5, 1.0);
        
        return (normalizedFrequency * 0.7) + (normalizedDifficulty * 0.3);
    }
    
    public rankTopics(topics: ExamTopic[]): ExamTopic[] {
        return topics.sort((a, b) => 
            this.calculateImportanceScore(b) - this.calculateImportanceScore(a)
        );
    }
}
