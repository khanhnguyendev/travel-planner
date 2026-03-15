// Convenience re-export of the server client as the default DB accessor.
// Import and call createClient() from this module in server components and actions.
export { createClient as default } from './server';
