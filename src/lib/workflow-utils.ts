import { randomUUID } from "crypto";

export function makeReference(prefix: "ENQ" | "QT" | "PKG") {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function optionalText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export function dateOrNull(value: unknown, fieldName: string): Date | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const raw = String(value).trim();
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(date.getTime())) throw new Error(`${fieldName} is not a valid date.`);
  return date;
}

export function currencyCode(value: unknown, fallback = "INR"): string {
  const currency = String(value ?? fallback).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Enter a valid 3-letter currency code.");
  return currency;
}

export function nonNegativeAmount(value: unknown, fieldName: string, fallback = 0): number {
  const raw = value === "" || value === null || value === undefined ? fallback : Number(value);
  if (!Number.isFinite(raw) || raw < 0) throw new Error(`${fieldName} must be zero or more.`);
  return Math.round(raw * 100) / 100;
}

export function positiveRate(value: unknown, fieldName: string, fallback = 1): number {
  const raw = value === "" || value === null || value === undefined ? fallback : Number(value);
  if (!Number.isFinite(raw) || raw <= 0) throw new Error(`${fieldName} must be greater than zero.`);
  return raw;
}

export function wholeNumber(value: unknown, fieldName: string, fallback: number, minimum: number): number {
  const raw = value === "" || value === null || value === undefined ? fallback : Number(value);
  if (!Number.isInteger(raw) || raw < minimum) throw new Error(`${fieldName} must be a whole number of at least ${minimum}.`);
  return raw;
}
