/**
 * Migration shim: converts a legacy quiz field into a synthetic assessment array
 * containing one CONFIDENCE_MCQ block per question.
 *
 * Legacy formats:
 *  - Single question: { question, options, correct }
 *  - Multi-question:  { questions: [{ id, type, question, options, correct }] }
 *
 * Returns an assessment array of CONFIDENCE_MCQ blocks.
 */
export function migrateLegacyQuiz(item) {
  if (!item.quiz) return [];
  const quiz = item.quiz;

  // Normalize to questions array
  let questions;
  if (quiz.questions) {
    questions = quiz.questions;
  } else {
    // Old single-question format
    questions = [{ id: "q1", type: "multiple_choice", question: quiz.question, options: quiz.options, correct: quiz.correct }];
  }

  return questions
    .filter(q => q.type === "multiple_choice")
    .map((q, i) => ({
      type: "CONFIDENCE_MCQ",
      id: `${item.id}_legacy_${q.id || i}`,
      question: q.question,
      options: q.options,
      correct: q.correct,
      topicTags: [],
      difficulty: 1,
      explanation: "",
    }));
}
