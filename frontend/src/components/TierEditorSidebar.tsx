import React, { useState, useEffect, useContext } from 'react';
import { Tier } from '../api';
import { SidebarContext } from '../App';

interface Props {
  tiers: Tier[];
  onAdd: () => void;
  onUpdate: (id: number, data: { name?: string; colour?: string }) => void;
  onDelete: (id: number) => void;
}

const TierEditorSidebar: React.FC<Props> = ({ tiers, onAdd, onUpdate, onDelete }) => {
  const { closeSidebar } = useContext(SidebarContext);
  const [local, setLocal] = useState<Tier[]>([]);

  useEffect(() => {
    setLocal(tiers);
  }, [tiers]);

  const handleNameChange = (id: number, value: string) => {
    setLocal(prev => prev.map(t => t.id === id ? { ...t, name: value } : t));
  };

  const handleColourChange = (id: number, value: string) => {
    setLocal(prev => prev.map(t => t.id === id ? { ...t, colour: value } : t));
    onUpdate(id, { colour: value });
  };

  const handleBlur = (id: number) => {
    const tier = local.find(t => t.id === id);
    if (tier) {
      onUpdate(id, { name: tier.name });
    }
  };

  return (
    <div className="p-4 options-sidebar">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold">Edit Tiers</h2>
        <button onClick={closeSidebar} className="text-lg">×</button>
      </div>
      {local.map(t => (
        <div key={t.id} className="flex items-center gap-2 mb-2">
          <input
            className="border rounded p-1 flex-1"
            value={t.name}
            onChange={e => handleNameChange(t.id, e.target.value)}
            onBlur={() => handleBlur(t.id)}
          />
          <input
            type="color"
            className="w-8 h-8 border rounded"
            value={t.colour}
            onChange={e => handleColourChange(t.id, e.target.value)}
          />
          <button onClick={() => onDelete(t.id)} className="text-red-500 px-2">×</button>
        </div>
      ))}
      <button onClick={onAdd} className="text-blue-500 px-2 mt-2">+ Add Tier</button>
    </div>
  );
};

export default TierEditorSidebar;
