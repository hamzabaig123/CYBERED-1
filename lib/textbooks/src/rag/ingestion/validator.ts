import { ParsedDocument } from "./structure-parser";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class DocumentValidator {
  /**
   * Validates the parsed document for completeness and quality before chunking.
   */
  validate(document: ParsedDocument): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!document.sections || document.sections.length === 0) {
      errors.push("Document has no parsed sections.");
    }

    if (document.sections.some((s) => !s.title)) {
      warnings.push("Some sections are missing titles.");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
