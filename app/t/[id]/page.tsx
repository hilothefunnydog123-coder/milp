import { notFound } from "next/navigation";
import { getTest } from "@/lib/store";
import { getField } from "@/lib/fields";
import ExamShell from "@/components/ExamShell";

export default async function SharedTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const test = getTest(id);
  if (!test) notFound();
  const field = getField(test.fieldId);
  if (!field) notFound();

  return (
    <ExamShell
      field={{
        id: field.id,
        name: field.name,
        brief: field.brief,
        requirements: field.requirements,
        tokenBudget: field.tokenBudget,
        timeLimit: field.timeLimit,
      }}
      lockedModel={test.lockedModel}
      org={test.org}
      title={test.title}
    />
  );
}
