import { notFound } from "next/navigation";
import { getField } from "@/lib/fields";
import { IS_LIVE } from "@/lib/gemini";
import ExamClient from "@/components/ExamClient";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ field: string }>;
}) {
  const { field: fieldId } = await params;
  const field = getField(fieldId);
  if (!field || !field.live) notFound();

  return (
    <ExamClient
      field={{
        id: field.id,
        name: field.name,
        brief: field.brief,
        requirements: field.requirements,
        timeLimit: field.timeLimit,
        tokenBudget: field.tokenBudget,
        live: IS_LIVE,
      }}
    />
  );
}
