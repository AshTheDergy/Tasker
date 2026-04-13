// NOT IDEAL, WILL BE WORKED ON

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";

const getTagColor = (pointValue, allTags) => {
  const values = allTags.map(t => t.pointValue ?? 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max === min) return "hsl(259, 100%, 69%)";
  const ratio = (pointValue - min) / (max - min);
  const lightness = 86 - ratio * 17;
  return `hsl(259, 100%, ${lightness}%)`;
};

const formatTagFromApi = (tag) => ({
  id: tag.id,
  name: tag.name,
  pointValue: tag.points_value ?? 0,
  color: tag.color,
});

const formatTagForApi = (tag) => ({
  name: tag.name,
  points_value: tag.pointValue,
  color: tag.color || "#7C3AED",
});

export default function TagSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();

  const flow = searchParams.get("flow") || location.state?.flow || "edit_tags";
  const familyId = searchParams.get("family") || location.state?.familyId;
  const postId = searchParams.get("post") || location.state?.postId;
  const commentId = searchParams.get("comment") || location.state?.commentId;
  const rebuttalTags = location.state?.rebuttalTags;

  const isAddTagsFlow = flow === "add_tags";
  const isEditTagsFlow = flow === "edit_tags";
  const isCompsetupFlow = flow === "compsetup";
  const isAcceptRebuttalFlow = flow === "accept_rebuttal";
  const isEditRebuttalFlow = flow === "edit_rebuttal";
  const isTaskRebuttalEditFlow = flow === "taskrebuttal_edit";
  const isAcceptTaskRebuttalFlow = flow === "accept_task_rebuttal";

  const showAddField = isEditTagsFlow || isCompsetupFlow || isAcceptRebuttalFlow || isEditRebuttalFlow;
  const showRadioSelect = isAddTagsFlow || isTaskRebuttalEditFlow || isAcceptTaskRebuttalFlow;
  const showResetBtn = isEditRebuttalFlow;
  const valuesEditable = !isAddTagsFlow && !isTaskRebuttalEditFlow && !isAcceptTaskRebuttalFlow;
  const showCompTabs = isAddTagsFlow;

  const title = isAddTagsFlow ? "Add Tags"
    : isCompsetupFlow ? "Set Tags"
    : "Edit Tags";

  const helperText = (isEditTagsFlow || isAcceptRebuttalFlow || isEditRebuttalFlow || isCompsetupFlow)
    ? "Swipe to remove. Tap to edit."
    : null;

  const [families, setFamilies] = useState([]);
  const [activeFamilyId, setActiveFamilyId] = useState(familyId || null);
  const [tags, setTags] = useState([]);
  const [originalTags, setOriginalTags] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagPoints, setNewTagPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.families?.length) { setLoading(false); return; }
    Promise.all(user.families.map(id => apiFetch(`/api/families/${id}`)))
      .then(data => {
        const valid = data.filter(Boolean);
        setFamilies(valid);
        if (!activeFamilyId && valid.length) setActiveFamilyId(valid[0].id);
      })
      .catch(console.error);
  }, [user?.id]);

  useEffect(() => {
    const fid = activeFamilyId || familyId;
    if (!fid) { setLoading(false); return; }
    setLoading(true);
    apiFetch(`/api/families/${fid}/tags`)
      .then(data => {
        let formatted;
        if ((isAcceptRebuttalFlow || isEditRebuttalFlow) && rebuttalTags) {
          formatted = rebuttalTags.map(formatTagFromApi);
        } else {
          formatted = data.map(formatTagFromApi);
        }
        setTags(formatted);
        setOriginalTags(JSON.parse(JSON.stringify(formatted)));
      })
      .catch(e => setError(e.data?.error || "Could not load tags"))
      .finally(() => setLoading(false));
  }, [activeFamilyId, familyId]);

  useEffect(() => {
    const stored = sessionStorage.getItem("selectedTagIds");
    if (stored) {
      setSelectedTagIds(JSON.parse(stored));
      sessionStorage.removeItem("selectedTagIds");
    }
  }, []);

  const toggleSelectTag = (tagId) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const removeTag = (id) => setTags(tags.filter(t => t.id !== id));

  const addTag = () => {
    if (!newTagName.trim()) return;
    setTags([...tags, {
      id: `temp_${Date.now()}`,
      name: newTagName.trim(),
      pointValue: newTagPoints || 0,
    }]);
    setNewTagName("");
    setNewTagPoints(0);
  };

  const handleReset = () => setTags(JSON.parse(JSON.stringify(originalTags)));

  const handleSave = async () => {
    const fid = activeFamilyId || familyId;
    setSaving(true);
    setError("");
    try {
      if (isAddTagsFlow || isTaskRebuttalEditFlow) {
        sessionStorage.setItem("selectedTagIds", JSON.stringify(selectedTagIds));
        navigate(-1);
      } else if (isAcceptTaskRebuttalFlow) {
        if (postId) {
          await apiFetch(`/api/posts/${postId}`, {
            method: "PUT",
            body: { tags: selectedTagIds },
          });
        }
        navigate(-1);
      } else if (isCompsetupFlow) {
        for (const tag of tags.filter(t => t.id.startsWith("temp_"))) {
          await apiFetch(`/api/families/${fid}/tags`, {
            method: "POST",
            body: formatTagForApi(tag),
          });
        }
        navigate(-1);
      } else if (isEditRebuttalFlow) {
        if (commentId) {
          await apiFetch(`/api/comments/${commentId}`, {
            method: "PUT",
            body: { proposed_tags: tags.map(t => ({ name: t.name, points_value: t.pointValue })) },
          });
        }
        navigate(-1);
      } else {
        sessionStorage.setItem("pendingTagChanges", JSON.stringify({
          familyId: fid,
          tags,
          originalTags,
          flow,
          postId,
          commentId,
          existingDescription: location.state?.existingDescription || "",
        }));
        navigate("/tagsetup2");
      }
    } catch (e) {
      console.error("Save error:", e);
      setError(e.data?.error || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center">Loading tags…</div>;
  }

  return (
    <div className="h-full bg-bg flex flex-col pt-12">

      {/* ── Header ── */}
      <div className="flex flex-col gap-2 text-center">
        <div className="relative flex items-center justify-between px-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-[30px] h-[30px]"
          >
            <img className="py-[7.5px]" src="src/assets/icons/chevron.svg" alt="Back" />
          </button>

          <h1 className="absolute left-1/2 -translate-x-1/2">{title}</h1>

          {showResetBtn ? (
            <button onClick={handleReset} className="buttonS white" disabled={saving}>
              Reset Changes
            </button>
          ) : (
            <div className="w-[30px]" />
          )}
        </div>

        {helperText && (
          <small className="text-dark-gray">{helperText}</small>
        )}

        {/* Competition tabs */}
        {showCompTabs && families.length > 0 && (
          <div className="w-full flex gap-4 px-16 pb-2 overflow-x-auto scroll-container">
            {families.map(fam => (
              <button
                key={fam.id}
                className="flex flex-col items-center justify-center flex-shrink-0"
                onClick={() => setActiveFamilyId(fam.id)}
              >
                <span className={activeFamilyId === fam.id ? "nbold" : ""}>
                  {fam.name}
                </span>
                {activeFamilyId === fam.id && (
                  <div className="w-full h-[2px] bg-black mt-0.5" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tag list */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 flex flex-col gap-6">
        {tags.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No tags yet</p>
        )}

        {tags.map(tag => (
          <div key={tag.id} className="flex items-center justify-between gap-3">

            {showRadioSelect ? (
              /* Radio-select row */
              <button
                className="flex items-center justify-between w-full gap-3"
                onClick={() => toggleSelectTag(tag.id)}
              >
                {/* Arrow tag */}
                <span
                  className="Btag flex-shrink-0"
                  style={{ backgroundColor: getTagColor(tag.pointValue, tags) }}
                >
                  <span style={{
                    color: "white",
                    fontFamily: "inter",
                    fontSize: "15px",
                    fontWeight: "bold",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {tag.name}
                  </span>
                </span>

                {/* Pts + radio */}
                <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                  {!isTaskRebuttalEditFlow && (
                    <div
                      className="flex items-center justify-center h-10 rounded-full px-3"
                      style={{
                        backgroundColor: "var(--color-light-gray)",
                        fontFamily: "inter",
                        fontSize: "15px",
                        fontWeight: "bold",
                        color: "var(--color-black)",
                        minWidth: "70px",
                      }}
                    >
                      {tag.pointValue} Pts
                    </div>
                  )}

                  {/* Radio circle */}
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selectedTagIds.includes(tag.id)
                        ? "bg-primary border-primary"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {selectedTagIds.includes(tag.id) && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>

            ) : (
              /* Editable row */
              <>
                <span
                  className="Btag"
                  style={{ backgroundColor: getTagColor(tag.pointValue, tags) }}
                >
                  <input
                    type="text"
                    value={tag.name}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "white",
                      fontFamily: "inter",
                      fontSize: "15px",
                      fontWeight: "bold",
                    }}
                    onChange={(e) =>
                      setTags(tags.map(t =>
                        t.id === tag.id ? { ...t, name: e.target.value } : t
                      ))
                    }
                  />
                </span>

                <div className="flex items-center gap-4 ml-auto flex-shrink-0">
                  {valuesEditable && (
                    <input
                      type="number"
                      placeholder="Pts"
                      value={tag.pointValue}
                      className="buttonM light"
                      style={{
                        fieldSizing: "content",
                        minWidth: "60px",
                        width: "auto",
                        textAlign: "right",
                        paddingRight: "8px",
                      }}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTags(tags.map(t =>
                          t.id === tag.id ? { ...t, pointValue: val } : t
                        ));
                      }}
                    />
                  )}
                  <button
                    className="active:scale-90 transition-transform flex-shrink-0"
                    onClick={() => removeTag(tag.id)}
                  >
                    <img src="src/assets/icons/checkt.svg" width={18} height={18} alt="Remove" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Fixed bottom */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 px-4 pb-4 bg-bg">

        {showAddField && (
          <div className="row">
            <input
              type="text"
              placeholder="Tag name"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addTag()}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                className="buttonM light"
                type="number"
                placeholder="Pts"
                value={newTagPoints || ""}
                onChange={(e) => setNewTagPoints(parseInt(e.target.value) || 0)}
                style={{ width: "70px", textAlign: "right" }}
              />
              <button
                className="flex items-center justify-center h-10 w-10 bg-light-gray rounded-full active:scale-90 transition-transform"
                onClick={addTag}
              >
                <img src="src/assets/icons/check.svg" alt="Add" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        <div className="flex gap-4">
          <button onClick={() => navigate(-1)} className="button alt" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="button default" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}