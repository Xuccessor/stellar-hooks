import { useStellarContext } from "../context";

/**
 * Read the active network configuration and switch networks at runtime.
 *
 * @example
 * ```tsx
 * const { network, switchNetwork } = useNetwork();
 *
 * return (
 *   <select value={network} onChange={(e) => switchNetwork(e.target.value as StellarNetwork)}>
 *     <option value="testnet">Testnet</option>
 *     <option value="mainnet">Mainnet</option>
 *   </select>
 * );
 * ```
 */
export function useNetwork() {
  const { config, network, switchNetwork } = useStellarContext();

  return {
    network,
    networkPassphrase: config.networkPassphrase,
    horizonUrl: config.horizonUrl,
    sorobanRpcUrl: config.sorobanRpcUrl,
    config,
    switchNetwork,
  };
}