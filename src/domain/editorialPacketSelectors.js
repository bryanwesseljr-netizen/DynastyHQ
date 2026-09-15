export const hasCompletePublishedWeekEvidence = (packet = {}) => Boolean(
  packet?.publicationId
  && packet?.opponent
  && packet?.score
  && packet?.evidence?.hasTeamComparison
);
