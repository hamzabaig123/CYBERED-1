import { ParsedDocument } from "./structure-parser";
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class DocumentValidator {
    /**
     * Validates the parsed document for completeness and quality before chunking.
     */
    validate(document: ParsedDocument): ValidationResult;
}
//# sourceMappingURL=validator.d.ts.map