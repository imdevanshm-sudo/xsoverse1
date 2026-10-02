/**
 * Storefront trust figures. These are shown to shoppers as fact, so they must be kept in line
 * with real, verifiable numbers (average review rating, gifts created in the current month).
 */
export const SOCIAL_PROOF = {
  rating: 4.9,
  giftsThisMonth: 1400,
};

export const socialProofLine = () =>
  `★ ${SOCIAL_PROOF.rating.toFixed(1)} · ${SOCIAL_PROOF.giftsThisMonth.toLocaleString('en-US')}+ gifts generated this month`;
