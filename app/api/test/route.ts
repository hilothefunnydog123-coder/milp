import { NextRequest, NextResponse } from "next/server";
import { createTest, getTest, listTestsByOrg, newTestId } from "@/lib/store";
import { getField } from "@/lib/fields";
import { getModel } from "@/lib/models";
import type { CustomTest } from "@/lib/types";

// GET /api/test?id=t_XXX  -> one test
// GET /api/test?org=Acme  -> all tests for an org
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const org = req.nextUrl.searchParams.get("org");
  if (id) {
    const t = getTest(id);
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ test: t });
  }
  if (org) return NextResponse.json({ tests: listTestsByOrg(org) });
  return NextResponse.json({ tests: [] });
}

// POST -> create a shareable test
export async function POST(req: NextRequest) {
  const body = await req.json();
  const field = getField(String(body.fieldId || ""));
  if (!field) return NextResponse.json({ error: "Unknown field." }, { status: 400 });

  const lockedModel = body.lockedModel ? getModel(String(body.lockedModel)).id : null;

  const test: CustomTest = {
    id: newTestId(),
    title: String(body.title || `${field.name} Screen`).slice(0, 80),
    fieldId: field.id,
    fieldName: field.name,
    org: String(body.org || "Acme Inc.").slice(0, 60),
    lockedModel,
    createdAt: new Date().toISOString(),
  };
  createTest(test);
  return NextResponse.json({ test });
}
