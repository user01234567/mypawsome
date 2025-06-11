import React, { useEffect, useState, useCallback, useContext } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchTierlistDetail,
  fetchItems,
  Tier,
  Item,
  updateItemTier,
  castVote,
  addItemToTierlist,
} from '../api';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas';
import AddItemModal from './AddItemModal';
import { TopbarContext, SidebarDefaultContext } from '../App';
import TierEditorSidebar from './TierEditorSidebar';
import { createTier, updateTier, deleteTier } from '../api';

interface TierlistPageProps {
  user: any;
}

interface ItemWithVotes extends Item {
  votingEnabled: boolean;
}

function hexToRgba(hex: string, alpha = 0.15) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const BACKEND_URL = "http://192.168.178.249:13371";
const TierlistPage: React.FC<TierlistPageProps> = ({ user }) => {
  const { setTopbarContent } = useContext(TopbarContext);
  const { setDefaultSidebarContent } = useContext(SidebarDefaultContext);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [tierlistName, setTierlistName] = useState<string | null>(null);
  const { id } = useParams<{ id: string }>();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [items, setItems] = useState<ItemWithVotes[]>([]);

  // Load tierlist details and items on mount
  useEffect(() => {
    async function load() {
      if (!id) return;
      const tl = await fetchTierlistDetail(Number(id));
      setTierlistName(tl.name ?? null); // set the name from backend
      setTiers(tl.tiers.sort((a, b) => a.position - b.position));
      const itms = await fetchItems(Number(id));
      setItems(itms.map((it) => ({ ...it, votingEnabled: false })));
    }
    load();
  }, [id]);

  // Set the global topbar with tierlist name and right buttons
  useEffect(() => {
    setTopbarContent(
      <div className="tierlistpage-topbar flex items-center justify-between w-full gap-3">
        {/* Center: Tierlist name */}
        <div className="tierlist-title-bar mx-auto text-lg font-bold flex-1 text-center">
          {tierlistName && tierlistName.trim().length > 0
            ? tierlistName
            : `Tierlist ${id}`}
        </div>
        {/* Right: Actions */}
        <div className="tierlist-actions flex gap-3 ml-auto">
          <button onClick={handleExport}>Export as PNG</button>
          <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
            onClick={() => setShowAddItem(true)}
          >
            + Add Item
          </button>
        </div>
      </div>
    );
    return () => setTopbarContent("Welcome, Senpai~! 🌱");
    // eslint-disable-next-line
  }, [setTopbarContent, tierlistName, id]);

  // Drag and drop logic
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const itemId = parseInt(result.draggableId);
    const destTierId =
      result.destination.droppableId === 'untiered'
        ? null
        : parseInt(result.destination.droppableId);

    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, tier_id: destTierId } : it))
    );
    await updateItemTier(itemId, destTierId);
  };

  // Voting logic
  const enableVoting = (itemId: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, votingEnabled: true } : it))
    );
  };

  const voteItem = async (itemId: number, tierId: number) => {
    await castVote(itemId, tierId);
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, votingEnabled: false } : it))
    );
  };

  // Export the visible tierlist container as a PNG
  const handleExport = async () => {
    const el = document.getElementById('tierlist-export');
    if (!el) return;
    const canvas = await html2canvas(el);
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `tierlist_${id}.png`;
    link.click();
  };

  // Add item via modal form
  const handleAddItem = async (formData: FormData) => {
    if (!id) return;
    await addItemToTierlist(Number(id), formData);
    // Reload items after adding!
    const itms = await fetchItems(Number(id));
    setItems(itms.map((it) => ({ ...it, votingEnabled: false })));
    setShowAddItem(false);
  };

  const handleAddTier = async () => {
    if (!id) return;
    const newTier = await createTier(Number(id), 'New Tier', '#cccccc');
    setTiers(prev => [...prev, newTier]);
  };

  const handleUpdateTier = async (tierId: number, data: { name?: string; colour?: string }) => {
    const updated = await updateTier(tierId, data);
    setTiers(prev => prev.map(t => t.id === tierId ? updated : t));
  };

  const handleDeleteTier = async (tierId: number) => {
    await deleteTier(tierId);
    setTiers(prev => prev.filter(t => t.id !== tierId));
  };

  // Provide tier editing sidebar for the global settings button
  useEffect(() => {
    setDefaultSidebarContent(
      <TierEditorSidebar
        tiers={tiers}
        onAdd={handleAddTier}
        onUpdate={handleUpdateTier}
        onDelete={handleDeleteTier}
      />
    );
    return () => setDefaultSidebarContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiers]);

  return (
    <div className="tierlist-root flex flex-col min-h-screen">
      {/* NO HEADER HERE! Only global topbar! */}
      <div className="tierlist-flexzone flex flex-1 min-h-0 overflow-hidden">
        <main className="tierlist-maincontent flex-1 p-6 overflow-auto">
          <div id="tierlist-export" className="tierlist-main-vertical">
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="tier-rows-vertical">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="tier-box-vertical"
                    data-tier-color={tier.colour}
                    style={
                      tier.colour
                        ? {
                            '--tier-color': tier.colour,
                            '--tier-bg': hexToRgba(tier.colour, 0.1),
                          } as React.CSSProperties
                        : {}
                    }
                  >
                    <div className="tier-label-left">
                      {tier.name}
                    </div>
                    <Droppable droppableId={tier.id.toString()} direction="horizontal">
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="tier-items-wrap"
                          style={{ minHeight: "110px" }}
                        >
                          {items
                            .filter((it) => it.tier_id === tier.id)
                            .map((it, index) => (
                              <Draggable
                                draggableId={it.id.toString()}
                                index={index}
                                key={it.id}
                              >
                                {(providedDr) => (
                                  <div
                                    ref={providedDr.innerRef}
                                    {...providedDr.draggableProps}
                                    {...providedDr.dragHandleProps}
                                    className="item-card"
                                  >
                                    {it.image_url && (
                                      <img
                                        src={BACKEND_URL + (it.preview_url || it.image_url)}
                                        alt={it.name}
                                        className="item-image"
                                        onClick={() =>
                                          setLightboxImage(BACKEND_URL + it.image_url)
                                        }
                                      />
                                    )}
                                    {it.name && (
                                      <span className="item-name tiered-item-name">
                                        {it.name}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
              {/* UNASSIGNED STICKY ROW */}
              <div className="unassigned-sticky-row">
                <h3 className="unassigned-label">Unassigned 🐻‍❄️</h3>
                <Droppable droppableId="untiered" direction="horizontal">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="unassigned-items-scroll"
                      style={{
                          minHeight: "80px",
                           }}
                    >
                      {items
                        .filter((it) => it.tier_id == null)
                        .map((it, index) => (
                          <Draggable
                            draggableId={it.id.toString()}
                            index={index}
                            key={it.id}
                          >
                            {(providedDr) => (
                              <div
                                ref={providedDr.innerRef}
                                {...providedDr.draggableProps}
                                {...providedDr.dragHandleProps}
                                className="item-card"
                              >
                                {it.image_url && (
                                  <img
                                    src={BACKEND_URL + (it.preview_url || it.image_url)}
                                    alt={it.name}
                                    className="item-image"
                                    onClick={() =>
                                      setLightboxImage(BACKEND_URL + it.image_url)
                                    }
                                  />
                                )}
                                {it.name && (
                                  <span className="item-name">{it.name}</span>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </DragDropContext>
          </div>
        </main>
      </div>
      {/* MODALS */}
      {showAddItem && (
        <AddItemModal
          onClose={() => setShowAddItem(false)}
          onAdd={handleAddItem}
        />
      )}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
          onClick={() => setLightboxImage(null)}
          style={{ cursor: "zoom-out" }}
        >
          <img
            src={lightboxImage}
            alt="Big Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default TierlistPage;
