// Validation des points de leçon : un point est validé quand on réussit un exercice qui s'y rattache.
import { CONSIGNES } from '../content/consignes';

export function validatePoints(prev: string[], templateId: string, success: boolean): string[] {
  if (!success) return prev;
  return [...new Set([...prev, ...(CONSIGNES[templateId]?.lecons ?? [])])];
}
