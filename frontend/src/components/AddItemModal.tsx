import React, { useState } from 'react';

interface AddItemModalProps {
  onClose: () => void;
  onAdd: (formData: FormData) => Promise<void>;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return; // No image, no toast!
    setLoading(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', imageFile);
    try {
      await onAdd(formData);
      onClose();
    } catch (err: any) {
      alert('Failed to add item: ' + (err?.message || err));
    }
    setLoading(false);
  };

  return (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
    <div className="modal-card p-6 w-[400px]">
        <h2 className="text-lg font-bold mb-4">Add New Item 🦊</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Name (optional)"
            className="w-full border rounded p-2"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            type="file"
            accept="image/*"
            className="w-full"
            required
            onChange={handleFileChange}
          />
          {preview && (
            <img src={preview} alt="preview" className="w-full max-h-48 object-contain rounded shadow" />
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400">Cancel</button>
            <button type="submit" className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600" disabled={!imageFile || loading}>
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
