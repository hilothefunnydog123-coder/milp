import { NextRequest, NextResponse } from "next/server";
import {
  addCredential,
  listCredentials,
  newCredentialId,
  persistToSupabase,
} from "@/lib/store";
import { getField } from "@/lib/fields";
import type { Credential } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ credentials: listCredentials() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const field = getField(String(body.fieldId || ""));
  if (!field) return NextResponse.json({ error: "Unknown field." }, { status: 400 });

  const cred: Credential = {
    id: newCredentialId(),
    field: field.name,
    fieldId: field.id,
    name: String(body.name || "Anonymous Candidate").slice(0, 40),
    overall: Math.round(Number(body.overall) || 0),
    grade: body.grade || "F",
    dimensions: {
      detection: Math.round(Number(body.dimensions?.detection) || 0),
      direction: Math.round(Number(body.dimensions?.direction) || 0),
      efficiency: Math.round(Number(body.dimensions?.efficiency) || 0),
    },
    verdict: String(body.verdict || "Assessed").slice(0, 60),
    issuedAt: new Date().toISOString(),
  };

  addCredential(cred);
  await persistToSupabase(cred);
  return NextResponse.json({ credential: cred });
}
