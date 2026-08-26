/**
 * Placeholder interface for the future challenge → institution matching
 * service. The real implementation will live behind ML_SERVICE_URL and be
 * owned by another team. Consumers should treat the return value as opaque
 * and rely only on the exported types.
 */

export type InstitutionRecommendation = {
  institutionId: string;
  score: number;
  reasons: string[];
};

export async function getInstitutionRecommendations(
  challengeId: string
): Promise<InstitutionRecommendation[]> {
  // Intentionally not implemented for the MVP. When the ML service is ready,
  // this will POST to `${process.env.ML_SERVICE_URL}/recommend` with the
  // challenge id and return a ranked list.
  void challengeId;
  return [];
}
