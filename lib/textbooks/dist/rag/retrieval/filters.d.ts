import { type SQL } from "drizzle-orm";
export interface SearchFilters {
    subjectId?: number;
    classId?: number;
    fileAssetId?: number;
    topicId?: number;
    chapterId?: number;
}
export declare function buildFilters(filters: SearchFilters): SQL | undefined;
//# sourceMappingURL=filters.d.ts.map