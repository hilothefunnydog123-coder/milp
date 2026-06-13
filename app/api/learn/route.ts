import { NextRequest, NextResponse } from "next/server";
import { learn, stats, type Category } from "@/lib/brain";

const VALID: Category[] = [
  "safety", "shelter", "rent", "documents", "benefits",
  "food", "legal", "veteran", "health", "work",
];

export async function GET() {
  return NextResponse.json(stats());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tags = Array.isArray(body.tags) ? body.tags.map(String) : [];
  const category = String(body.category) as Category;
  const helped = body.helped !== false;
  if (VALID.includes(category) && tags.length) {
    learn(tags, category, helped);
  }
  return NextResponse.json(stats());
}
