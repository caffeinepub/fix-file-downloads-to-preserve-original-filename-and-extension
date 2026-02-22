/**
 * Centralized actor creation utility to ensure authenticated sessions
 * properly apply Internet Identity without triggering the double-configuration warning.
 */

import { createActorWithConfig } from '../config';
import type { Identity } from '@dfinity/agent';
import type { backendInterface } from '../backend';

/**
 * Creates an anonymous actor (for logged-out users)
 */
export async function createAnonymousActor(): Promise<backendInterface> {
  return await createActorWithConfig();
}

/**
 * Creates an authenticated actor with the provided identity
 * (for logged-in users via Internet Identity)
 */
export async function createAuthenticatedActor(identity: Identity): Promise<backendInterface> {
  // Pass identity through agentOptions only (not as a separate agent)
  // to avoid the "Detected both agent and agentOptions" warning
  return await createActorWithConfig({
    agentOptions: {
      identity,
    },
  });
}
