import { buildPublishedWeekEditorialPacket, editorialPacketFactRows } from './publishedWeekEditorialPacket.js';

export const withPublishedWeekEditorialPacket = (state = {}, publicationId = '') => {
  const packet = buildPublishedWeekEditorialPacket(state, publicationId);
  const packetFacts = editorialPacketFactRows(packet);
  return { packet, packetFacts };
};
