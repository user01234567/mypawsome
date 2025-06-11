import React, { useState } from 'react';

export interface TierDef {
  name: string;
  colour: string;
}

interface NewTierlistModalProps {
  onClose: () => void;
  onCreate: (name: string, tiers: TierDef[]) => void;
}

const S_TIER_COLOUR = '#7b112c'; // deep wine red

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Orange -> yellow -> green -> blue
function gradientColour(index: number, total: number): string {
  if (total <= 1) return '#ffa500'; // orange
  const t = index / (total - 1);
  let start: [number, number, number];
  let end: [number, number, number];
  let localT: number;

  if (t <= 1 / 3) {
    start = [255, 165, 0]; // orange
    end = [255, 255, 0]; // yellow
    localT = t * 3;
  } else if (t <= 2 / 3) {
    start = [255, 255, 0]; // yellow
    end = [0, 255, 0]; // green
    localT = (t - 1 / 3) * 3;
  } else {
    start = [0, 255, 0]; // green
    end = [0, 0, 255]; // blue
    localT = (t - 2 / 3) * 3;
  }

  const r = Math.round(start[0] + (end[0] - start[0]) * localT);
  const g = Math.round(start[1] + (end[1] - start[1]) * localT);
  const b = Math.round(start[2] + (end[2] - start[2]) * localT);
  return rgbToHex(r, g, b);
}

function generateDefaultTiers(): TierDef[] {
  const result: TierDef[] = [{ name: 'S-Tier', colour: S_TIER_COLOUR }];
  const gradientCount = 6; // A-F
  for (let i = 0; i < gradientCount; i++) {
    const name = `${String.fromCharCode(65 + i)}-Tier`;
    result.push({ name, colour: gradientColour(i, gradientCount) });
  }
  return result;
}

function applyGradient(tierList: TierDef[]): TierDef[] {
  if (tierList.length === 0) return tierList;
  const gradientCount = tierList.length - 1;
  return tierList.map((t, idx) => {
    if (idx === 0) return { ...t, colour: S_TIER_COLOUR };
    return { ...t, colour: gradientColour(idx - 1, gradientCount) };
  });
}

const defaultTiers = generateDefaultTiers();

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
    const updated = [...tiers, { name: '', colour: '#cccccc' }];
    setTiers(applyGradient(updated));
  };

  const handleRemoveTier = (idx: number) => {
    const updated = tiers.filter((_, i) => i !== idx);
    setTiers(applyGradient(updated));
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
