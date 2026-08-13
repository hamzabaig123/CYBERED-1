export class CitationVerifier {
  constructor() {}

  public verify(answer: string, context: string): boolean {
    const citationRegex = /\[Citation \d+\]/g;
    const hasCitations = citationRegex.test(answer);
    return hasCitations;
  }
}
