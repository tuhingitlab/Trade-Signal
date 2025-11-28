import React from 'react';
import { Asset } from '../types';
import { ASSETS } from '../constants';
import clsx from 'clsx';

interface AssetSelectorProps {
  currentAsset: Asset;
  onSelect: (asset: Asset) => void;
}

export const AssetSelector: React.FC<AssetSelectorProps> = ({ currentAsset, onSelect }) => {
  return (
    <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
      {ASSETS.map((asset) => (
        <button
          key={asset.id}
          onClick={() => onSelect(asset.id)}
          className={clsx(
            "flex items-center space-x-2 px-4 py-3 rounded-xl border transition-all duration-200 min-w-[140px]",
            currentAsset === asset.id
              ? "bg-crypto-panel border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
              : "bg-crypto-dark border-crypto-accent hover:border-gray-600 opacity-60 hover:opacity-100"
          )}
        >
          <span className="text-xl">{asset.icon}</span>
          <div className="text-left">
            <div className={clsx(
              "font-bold font-mono text-sm",
              currentAsset === asset.id ? "text-white" : "text-gray-400"
            )}>
              {asset.id}
            </div>
            <div className="text-xs text-gray-500">{asset.name}</div>
          </div>
        </button>
      ))}
    </div>
  );
};