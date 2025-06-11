import React from 'react';

interface VersionHistoryProps {
  versions: any[];
  onRevert: (version: any) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ versions, onRevert }) => {
  return (
    <div className="bg-white rounded p-4 shadow">
      <h3 className="font-semibold mb-2">Version History</h3>

      {versions.length === 0 && (
        <div className="text-sm text-gray-500">No versions saved yet.</div>
      )}

      <ul className="space-y-2 max-h-48 overflow-y-auto">
        {versions.map((v, idx) => (
          <li key={idx} className="flex justify-between items-center">
            <span className="text-sm">{new Date(v.timestamp).toLocaleString()}</span>
            <button
              className="text-red-500 text-xs hover:underline"
              onClick={() => onRevert(v)}
            >
              Revert
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VersionHistory;
