import React, { useState, useEffect } from 'react';
import NewTierlistModal, { TierDef } from './NewTierlistModal';

export interface TierDef {
  name: string;
  colour: string;
}

interface NewTierlistModalProps {
  onClose: () => void;
  onCreate: (name: string, tiers: TierDef[]) => void;
}

const defaultTiers = [
  { name: 'S-Tier', colour: '#FFD700' },
  { name: 'A-Tier', colour: '#C0C0C0' },
  { name: 'B-Tier', colour: '#CD7F32' }
];

const NewTierlistModal: React.FC<NewTierlistModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [tiers, setTiers] = useState<TierDef[]>(defaultTiers);

  const handleTierNameChange = (idx: number, value: string) => {
    const newTiers = [...tiers];
    newTiers[idx].name = value;
    setTiers(newTiers);
  };

  const handleTierColorChange = (idx: number, value: string) => {
    const newTiers = [...tiers];
    newTiers[idx].colour = value;
    setTiers(newTiers);
  };

  const handleAddTier = () => {
    setTiers([...tiers, { name: '', colour: '#cccccc' }]);
  };

  const handleRemoveTier = (idx: number) => {
    setTiers(tiers.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || tiers.length === 0 || tiers.some(t => !t.name.trim())) return;
    onCreate(name, tiers);
  };

  return (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-50">
    <div className="modal-card p-6 w-[420px]">
        <h2 className="text-xl font-bold mb-4">Create New Tierlist 🐾</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full border rounded p-2"
            placeholder="Tierlist name (e.g., Best Snails)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <div>
            <label className="font-semibold">Tiers</label>
            <div className="space-y-2">
              {tiers.map((tier, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="border rounded p-1 flex-1"
                    placeholder={`Tier ${idx + 1}`}
                    value={tier.name}
                    onChange={e => handleTierNameChange(idx, e.target.value)}
                    required
                  />
                  <input
                    type="color"
                    className="w-8 h-8 border rounded"
                    value={tier.colour}
                    onChange={e => handleTierColorChange(idx, e.target.value)}
                  />
                  {tiers.length > 1 && (
                    <button type="button" onClick={() => handleRemoveTier(idx)} className="text-red-500 px-2">
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={handleAddTier} className="text-blue-500 px-2">+ Add Tier</button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
            <button type="submit" className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTierlistModal;
