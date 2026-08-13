import { RagMode, RouterContext } from "./rag-modes";

export class RagRouter {
    public determineMode(query: string, context: RouterContext): RagMode {
        if (context.hasExamContext && query.toLowerCase().includes("exam")) {
            return RagMode.EXAM_PREP;
        }
        
        if (context.complexityScore > 0.8 || query.length > 200) {
            return RagMode.DEEP_RESEARCH;
        }
        
        if (query.toLowerCase().includes("explain") || query.toLowerCase().includes("what is")) {
            return RagMode.CONCEPT_EXPLANATION;
        }
        
        return RagMode.FAST_SEARCH;
    }
}
