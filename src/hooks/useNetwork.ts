import { useStellarContext } from "../context";

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