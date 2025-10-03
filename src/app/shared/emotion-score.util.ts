// Mapea cada emoción a su valor base en 0..5
// (si quieres neutra=2 en lugar de 2.5, cambia aquí y todo el front quedará alineado)
const EMOTION_BASE: Record<string, number> = {
  nerviosa: 0,
  ansiosa: 1,
  neutra: 2,
  confiada: 3,
  motivada: 4,
  entusiasta: 5
};

/**
 * Promedio ponderado por probabilidad:
 * score = sum(prob[emo] * base[emo]) para las 6 emociones
 * Luego redondeo al 0.5 más cercano y se limita a [0.5, 5].
 */
export function computeEmotionScore(
  probs: Record<string, number>,
  roundToHalf = true,
  clampToRange = true
): number {
  if (!probs) return 0;

  // 1) promedio ponderado crudo (0..5 por construcción)
  let score = 0;
  for (const [emo, p] of Object.entries(probs)) {
    const base = EMOTION_BASE[emo] ?? EMOTION_BASE['neutra'];
    score += (p || 0) * base;
  }

  // 2) redondeo opcional a 0.5
  if (roundToHalf) score = Math.round(score * 2) / 2;

  // 3) clamp opcional (para UI de estrellas)
  if (clampToRange) score = Math.max(0.5, Math.min(5, score));

  return score;
}
