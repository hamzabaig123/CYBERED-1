export interface GenerationConfig {
    temperature?: number;
    maxOutputTokens?: number;
}
export declare class GroundedAnswerGenerator {
    private apiClient;
    constructor(apiClient: any);
    generateAnswer(query: string, context: string, config?: GenerationConfig): Promise<string>;
}
//# sourceMappingURL=grounded-answer.d.ts.map