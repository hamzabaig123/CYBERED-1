export const GenerationPrompts = {
  getGroundedQAPrompt: (query: string, context: string) => `
You are an expert educational assistant. Answer the user's question using ONLY the information provided in the context below. 
If the context does not contain the answer, say "I cannot answer this based on the provided context."

Context:
${context}

Question: ${query}

Answer (include citations in the format [Citation X]):
  `.trim(),

  getEvaluationPrompt: (query: string, answer: string, context: string) => `
Evaluate the following answer based on the provided context. 
Check for accuracy and whether the answer is fully grounded in the context.

Context:
${context}

Question: ${query}
Answer: ${answer}

Evaluation:
  `.trim()
};
