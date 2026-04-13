// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { useUser } from "../context/UserContext";
// import { apiFetch } from "../lib/api";

// // Generate color based on label index for visual variety
// const getLabelColor = (index) => {
//   const hues = [259, 200, 160, 340, 30, 180]; // Purple, blue, teal, pink, orange, cyan
//   const hue = hues[index % hues.length];
//   return `hsl(${hue}, 100%, 69%)`;
// };

// function SoloTags() {
//   const navigate = useNavigate();
//   const { user } = useUser();
  
//   const [labels, setLabels] = useState([]);
//   const [originalLabels, setOriginalLabels] = useState([]);
//   const [newLabelName, setNewLabelName] = useState("");
//   const [newLabelColor, setNewLabelColor] = useState("#7C3AED");
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");

//   // Fetch personal labels on mount
//   useEffect(() => {
//     if (!user?.id) {
//       setError("Please log in to manage tags");
//       setLoading(false);
//       return;
//     }
    
//     apiFetch(`/api/labels?owner=${user.id}`)
//       .then(data => {
//         // Map backend format to frontend
//         const formatted = data.map((label, idx) => ({
//           id: label.id,
//           name: label.name,
//           color: label.color || getLabelColor(idx),
//         }));
//         setLabels(formatted);
//         setOriginalLabels(JSON.parse(JSON.stringify(formatted)));
//       })
//       .catch(e => {
//         console.error("Failed to load labels:", e);
//         setError(e.data?.error || "Could not load tags");
//       })
//       .finally(() => setLoading(false));
//   }, [user?.id]);

//   const removeLabel = (id) => {
//     setLabels(labels.filter(label => label.id !== id));
//   };

//   const addLabel = () => {
//     if (!newLabelName.trim()) return;
//     const newLabel = {
//       id: `temp_${Date.now()}`,
//       name: newLabelName.trim(),
//       color: newLabelColor,
//     };
//     setLabels([...labels, newLabel]);
//     setNewLabelName("");
//     // Cycle through colors for next label
//     const hues = [259, 200, 160, 340, 30, 180];
//     const nextIdx = (hues.indexOf(parseInt(newLabelColor.slice(4))) + 1) % hues.length;
//     setNewLabelColor(`hsl(${hues[nextIdx]}, 100%, 69%)`);
//   };

//   const handleCancel = () => {
//     navigate(-1);
//   };

//   const handleReset = () => {
//     setLabels(JSON.parse(JSON.stringify(originalLabels)));
//   };

//   const handleSave = async () => {
//     if (!user?.id) return;
//     setSaving(true);
//     setError("");
    
//     try {
//       const originalIds = new Set(originalLabels.map(l => l.id));
//       const currentIds = new Set(labels.map(l => l.id));
      
//       // 1. Delete removed labels
//       const deleted = originalLabels.filter(l => !currentIds.has(l.id) && l.id.startsWith("rec"));
//       for (const label of deleted) {
//         await apiFetch(`/api/labels/${label.id}`, { method: "DELETE" });
//       }
      
//       // 2. Create new labels (temp IDs)
//       const newLabels = labels.filter(l => l.id.startsWith("temp_"));
//       for (const label of newLabels) {
//         const res = await apiFetch("/api/labels", {
//           method: "POST",
//           body: {
//             name: label.name,
//             color: label.color,
//           },
//         });
//         // Update local label with real ID from backend
//         setLabels(prev => prev.map(l => 
//           l.id === label.id ? { ...l, id: res.id } : l
//         ));
//       }
      
//       // 3. Update modified labels
//       const updated = labels.filter(l => 
//         originalIds.has(l.id) && !l.id.startsWith("temp_")
//       );
//       for (const label of updated) {
//         const original = originalLabels.find(ol => ol.id === label.id);
//         if (original && (original.name !== label.name || original.color !== label.color)) {
//           await apiFetch(`/api/labels/${label.id}`, {
//             method: "PUT",
//             body: {
//               name: label.name,
//               color: label.color,
//             },
//           });
//         }
//       }
      
//       // Refresh originalLabels to match saved state
//       const refreshed = await apiFetch(`/api/labels?owner=${user.id}`);
//       const formatted = refreshed.map((label, idx) => ({
//         id: label.id,
//         name: label.name,
//         color: label.color || getLabelColor(idx),
//       }));
//       setOriginalLabels(formatted);
      
//       navigate(-1);
      
//     } catch (e) {
//       console.error("Save error:", e);
//       setError(e.data?.error || "Failed to save changes");
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return <div className="h-full flex items-center justify-center">Loading tags…</div>;
//   }

//   if (error && !labels.length) {
//     return (
//       <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
//         <p className="text-red-500 font-semibold">{error}</p>
//         <button onClick={() => navigate(-1)} className="buttonM">Go Back</button>
//       </div>
//     );
//   }

//   return (
//     <div className="h-full bg-bg flex flex-col gap-[8px] pt-12">
//       {/* Header */}
//       <div className="flex flex-col gap-[8px] text-center">
//         <div className="relative flex items-center justify-between px-[32px]">
//           <button onClick={() => navigate(-1)} className="flex justify-center w-[30px] h-[30px]">
//             <img className="py-[7.5px]" src="src/assets/icons/chevron.svg" alt="Back" />
//           </button>
//           <h1 className="absolute left-1/2 -translate-x-1/2">My Tags</h1>
//           <button onClick={handleReset} className="buttonS white" disabled={saving}>
//             Reset
//           </button>
//         </div>
//         <small className="text-dark-gray">Tap to edit name or color</small>
//       </div>

//       {/* Label List */}
//       <div className="p-[16px] flex flex-col gap-[24px]">
//         {labels.map((label, idx) => (
//           <div className="flex items-center justify-between" key={label.id}>
//             {/* Label preview chip */}
//             <div 
//               className="Btag flex items-center gap-2 px-3 py-2 rounded-xl"
//               style={{ backgroundColor: label.color }}
//             >
//               <input
//                 type="text"
//                 value={label.name}
//                 className="bg-transparent border-none outline-none text-white font-bold text-[15px] min-w-[80px]"
//                 onChange={(e) => {
//                   setLabels(labels.map(l =>
//                     l.id === label.id ? { ...l, name: e.target.value } : l
//                   ));
//                 }}
//               />
//               {/* Color picker trigger */}
//               <input
//                 type="color"
//                 value={label.color}
//                 onChange={(e) => {
//                   setLabels(labels.map(l =>
//                     l.id === label.id ? { ...l, color: e.target.value } : l
//                   ));
//                 }}
//                 className="w-6 h-6 rounded cursor-pointer border-2 border-white/50"
//                 title="Change color"
//               />
//             </div>

//             {/* Delete button */}
//             <button
//               className="flex-shrink-0 active:scale-90 transition-transform text-red-500"
//               onClick={() => removeLabel(label.id)}
//             >
//               <img src="src/assets/icons/trash.png" width={20} height={20} alt="Delete" />
//             </button>
//           </div>
//         ))}
//       </div>

//       {/* Fixed bottom: Add new + Save/Cancel */}
//       <div className="absolute bottom-0 flex flex-col gap-[16px] left-0 right-0 px-[16px] pb-[16px]">
//         {/* Add new label row */}
//         <div className="row bg-white rounded-2xl p-3 flex items-center gap-2">
//           <input
//             type="text"
//             placeholder="New tag name"
//             value={newLabelName}
//             onChange={(e) => setNewLabelName(e.target.value)}
//             className="flex-1 bg-transparent border-none outline-none"
//             onKeyDown={(e) => e.key === "Enter" && addLabel()}
//           />
//           <input
//             type="color"
//             value={newLabelColor}
//             onChange={(e) => setNewLabelColor(e.target.value)}
//             className="w-8 h-8 rounded cursor-pointer"
//             title="Pick color"
//           />
//           <button
//             className="flex items-center justify-center h-[36px] w-[36px] bg-light-gray rounded-full active:scale-90 transition-transform"
//             onClick={addLabel}
//           >
//             <img src="src/assets/icons/check.svg" alt="Add" width={18} height={18} />
//           </button>
//         </div>
        
//         {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
//         {/* Action buttons */}
//         <div className="flex gap-[16px]">
//           <button onClick={handleCancel} className="button alt" disabled={saving}>
//             Cancel
//           </button>
//           <button
//             onClick={handleSave}
//             className="button default"
//             disabled={saving || JSON.stringify(labels) === JSON.stringify(originalLabels)}
//           >
//             {saving ? "Saving…" : "Save"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default SoloTags;