import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function supabaseErrorStatus(message: string) {
  if (/capacity/i.test(message)) return 409;
  if (/closed|started|ended|cancelled|draft|published/i.test(message)) return 409;
  if (/already registered|duplicate/i.test(message)) return 409;
  if (/not found/i.test(message)) return 404;
  if (/signed in|profile|organizer|permission/i.test(message)) return 403;
  return 400;
}
