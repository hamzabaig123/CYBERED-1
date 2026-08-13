export enum QueryIntent {
  FACTUAL = 'factual',
  CONCEPTUAL = 'conceptual',
  COMPARATIVE = 'comparative',
  PROCEDURAL = 'procedural',
  UNKNOWN = 'unknown'
}

export interface ClassificationResult {
  intent: QueryIntent;
  confidence: number;
}

export class QueryClassifier {
  constructor() {}

  public async classify(query: string): Promise<ClassificationResult> {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('how to') || lowerQuery.includes('step') || lowerQuery.includes('procedure')) {
      return { intent: QueryIntent.PROCEDURAL, confidence: 0.8 };
    }
    
    if (lowerQuery.includes('what is') || lowerQuery.includes('define') || lowerQuery.includes('who')) {
      return { intent: QueryIntent.FACTUAL, confidence: 0.8 };
    }

    if (lowerQuery.includes('difference between') || lowerQuery.includes('vs') || lowerQuery.includes('compare')) {
      return { intent: QueryIntent.COMPARATIVE, confidence: 0.8 };
    }

    if (lowerQuery.includes('concept') || lowerQuery.includes('explain') || lowerQuery.includes('why')) {
      return { intent: QueryIntent.CONCEPTUAL, confidence: 0.8 };
    }

    return { intent: QueryIntent.UNKNOWN, confidence: 0.5 };
  }
}
