/**
 * Utility for memoizing Horizon and RPC server instances.
 * Instances are cached per URL to avoid repeated construction.
 */
import { Horizon, rpc } from "@stellar/stellar-sdk";

const horizonCache = new Map<string, Horizon.Server>();
const rpcCache = new Map<string, rpc.Server>();

export function getHorizonServer(url: string): Horizon.Server {
  let server = horizonCache.get(url);
  if (!server) {
    server = new Horizon.Server(url);
    horizonCache.set(url, server);
  }
  return server;
}

export function getRpcServer(url: string): rpc.Server {
  let server = rpcCache.get(url);
  if (!server) {
    server = new rpc.Server(url);
    rpcCache.set(url, server);
  }
  return server;
}

/** Clear memoized caches – useful for tests to avoid stale instances */
export function clearMemoizedServers(): void {
  horizonCache.clear();
  rpcCache.clear();
}
