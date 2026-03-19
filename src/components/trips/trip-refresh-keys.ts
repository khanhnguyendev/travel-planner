export const TRIP_SECTION_REFRESH_EVENT = 'trip-section-refresh';

export const TRIP_REFRESH_SECTIONS = {
  budget: 'trip-budget',
  crew: 'trip-crew',
  invites: 'trip-invites',
  joinRequests: 'trip-join-requests',
  places: 'trip-places',
  stops: 'trip-stops',
  timeline: 'trip-timeline',
  map: 'trip-map',
  expenses: 'trip-expenses',
  activity: 'trip-activity',
  placeDetail: 'trip-place-detail',
} as const;

export type TripRefreshSection = (typeof TRIP_REFRESH_SECTIONS)[keyof typeof TRIP_REFRESH_SECTIONS];
