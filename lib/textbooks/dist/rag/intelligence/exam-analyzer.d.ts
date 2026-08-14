export interface ExamTopic {
    name: string;
    frequencyInPastExams: number;
    difficultyWeight: number;
}
export declare class ExamAnalyzer {
    calculateImportanceScore(topic: ExamTopic): number;
    rankTopics(topics: ExamTopic[]): ExamTopic[];
}
//# sourceMappingURL=exam-analyzer.d.ts.map