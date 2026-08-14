export interface GoldenQuestion {
    id: string;
    question: string;
    class: number;
    subject: string;
    chapter: string;
    expected_pages: number[];
    expected_source: string;
    answer_type: string;
}
export declare function loadGoldenDataset(filePath?: string): GoldenQuestion[];
//# sourceMappingURL=golden-dataset.d.ts.map