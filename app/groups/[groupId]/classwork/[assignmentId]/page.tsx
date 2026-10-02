import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  getAssignmentDetail,
  getAssignmentSubmissions,
  getQuizForAssignment,
} from "@/app/groups/actions";
import SubmissionForm from "./SubmissionForm";
import QuizBuilder from "./QuizBuilder";
import QuizTaker from "./QuizTaker";
import GradingPanel from "./GradingPanel";
import { formatDate, formatDateTime } from "@/utils/formatDate";

export const dynamic = "force-dynamic";

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ groupId: string; assignmentId: string }>;
}) {
  const { groupId, assignmentId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    redirect("/sign-in");
  }

  let detail;
  try {
    detail = await getAssignmentDetail(assignmentId);
  } catch {
    notFound();
  }

  const { assignment, attachments, mySubmission, mySubmissionAttachments, isTutor } = detail;

  // Guard against a mismatched groupId in the URL.
  if (assignment.groupId !== groupId) {
    notFound();
  }

  const quiz = isTutor || assignment.status === "published" ? await getQuizForAssignment(assignmentId) : null;

  const grading = isTutor
    ? await getAssignmentSubmissions(assignmentId)
    : { submissions: [], maxPoints: assignment.points, title: assignment.title };

  const isOverdue = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;

  return (
    <div className="flex flex-col gap-5" data-testid="assignment-detail">
      <div>
        <Link
          href={`/groups/${groupId}/classwork`}
          className="text-sm font-bold text-primary hover:underline"
          data-testid="back-to-classwork"
        >
          ← Back to classwork
        </Link>

        <div className="clay-card p-5 mt-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold" data-testid="assignment-title">
              {assignment.title}
            </h2>
            <span className="rounded-full bg-background/70 px-3 py-1 text-xs font-bold uppercase">
              {assignment.status}
            </span>
          </div>

          {assignment.description && (
            <p className="text-sm text-on-surface/70 mt-2 whitespace-pre-wrap">{assignment.description}</p>
          )}

          {assignment.instructions && (
            <div className="mt-3 rounded-2xl bg-background/60 p-4">
              <p className="text-xs font-extrabold uppercase tracking-wide text-on-surface/60 mb-1">
                Instructions
              </p>
              <p className="text-sm whitespace-pre-wrap">{assignment.instructions}</p>
            </div>
          )}

          <p className="text-xs font-semibold text-on-surface/50 mt-3">
            {assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" })}` : "No due date"} ·{" "}
            {assignment.points} points
            {isOverdue && <span className="text-error"> · overdue</span>}
          </p>

          {attachments.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1">
              {attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={a.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold text-primary underline"
                  >
                    {a.fileName ?? "Attachment"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isTutor ? (
        <>
          {quiz ? (
            <section className="clay-card p-5" data-testid="quiz-exists">
              <h3 className="font-display font-extrabold mb-2">Quiz</h3>
              <p className="text-sm text-on-surface/70">
                {quiz.questions.length} question(s)
                {quiz.quiz.passingScore != null ? ` · pass mark ${quiz.quiz.passingScore} pts` : ""}
                {quiz.quiz.allowRetakes ? " · retakes allowed" : ""}
              </p>
              <ul className="mt-3 flex flex-col gap-2" data-testid="quiz-question-preview">
                {quiz.questions.map((q, i) => (
                  <li key={q.id} className="rounded-2xl bg-background/60 p-3 text-sm">
                    <p className="font-bold">
                      {i + 1}. {q.questionText}
                    </p>
                    <p className="text-xs text-on-surface/50">
                      {q.questionType.replace(/_/g, " ")} · {q.points} pts
                      {q.options.length > 0 && (
                        <>
                          {" · "}
                          {q.options
                            .map((o) => `${o.optionText}${o.isCorrect ? " (correct)" : ""}`)
                            .join(" | ")}
                        </>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <QuizBuilder assignmentId={assignmentId} />
          )}

          <GradingPanel
            groupId={groupId}
            rows={grading.submissions}
            maxPoints={grading.maxPoints}
          />
        </>
      ) : (
        <>
          {quiz && quiz.questions.length > 0 && (
            <QuizTaker
              quizId={quiz.quiz.id}
              questions={quiz.questions}
              attempts={quiz.attempts}
            />
          )}

          <SubmissionForm
            groupId={groupId}
            assignmentId={assignmentId}
            initialText={mySubmission?.textAnswer ?? null}
            initialStatus={mySubmission?.status ?? "draft"}
            initialAttachments={mySubmissionAttachments}
            readOnly={mySubmission?.status === "graded" || mySubmission?.status === "returned"}
          />

          {(mySubmission?.status === "graded" || mySubmission?.status === "returned") && (
            <section className="clay-card p-5" data-testid="my-grade">
              <h3 className="font-display font-extrabold mb-1">Your grade</h3>
              <p className="font-extrabold text-primary" data-testid="my-grade-points">
                {mySubmission?.pointsEarned}/{assignment.points}
              </p>
              {mySubmission?.feedback && (
                <p className="text-sm mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}