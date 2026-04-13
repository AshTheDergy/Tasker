// // Still uses the old API system, and hasnt been reworked yet
// // Will be reworked in the future
// // Currently improvised, will be changed
// // NOT IDEAL, WILL BE WORKED ON

// import { useState, useEffect } from "react";

// //saab olla tag_setup_fromnewtask laadne

// export default function ProposedTags() {
//   const [tags, setTags] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchTags = async () => {
//       try {
//         const response = await fetch("api/ags");
//         if (!response.ok) throw new Error("Failed to fetch tags");
//         const data = await response.json();
//         setTags(data);
//       } catch (err) {
//         console.error(err);
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchTags();
//   }, []);

//   const moveUp = (index) => {
//     if (index === 0) return;
//     const updated = [...tags];
//     [updated[index - 1], updated[index]] = [
//       updated[index],
//       updated[index - 1],
//     ];
//     setTags(updated);
//   };

//   const moveDown = (index) => {
//     if (index === tags.length - 1) return;
//     const updated = [...tags];
//     [updated[index + 1], updated[index]] = [
//       updated[index],
//       updated[index + 1],
//     ];
//     setTags(updated);
//   };

//   return (
//     <div>
//       {/* Header */}
//       <div>
//         <button onClick={() => console.log("Go back")}>{"<"}</button> {/* nupp (./pages/tagrebuttals) */}
//         <h2>Proposed Tags</h2>
//       </div>

//       {loading && <p>Loading...</p>}
//       {error && <p style={{ color: "red" }}>Error: {error}</p>}

//       {/* Tag List */}
//       <div>
//         {tags.map((tag, index) => (
//           <div key={tag.id}>
//             <span>{tag.name}</span>

//             {tag.points !== null && (
//               <span> {tag.points} pts </span>
//             )}

//             <button onClick={() => moveUp(index)}>↑</button>
//             <button onClick={() => moveDown(index)}>↓</button>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }