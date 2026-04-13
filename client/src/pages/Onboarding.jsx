import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const slides = [
  {
    title: "Compete With Your Circle",
    image: "/src/assets/icons/ob1.svg",
    body: (
      <>
        Create or join private, invite-only groups. These act as your competition arenas where
        you track tasks and compete on the leaderboard.
      </>
    ),
  },
  {
    title: "Submit Tasks & Tag Them",
    image: "/src/assets/icons/ob2.svg",
    body: (
      <>
        Complete tasks and submit photo evidence. Point values are determined by <strong>tags</strong>.
        Your group decides which tags exist and exactly how many points they are worth.
      </>
    ),
  },
  {
    title: "The Verification Process",
    image: "/src/assets/icons/ob3.svg",
    body: (
      <>
        Submitted tasks start as <strong>Pending</strong>. If no one objects, they automatically
        verify and award points after 48 hours. Group members can also manually verify your task
        to speed up the process.
      </>
    ),
  },
  {
    title: "Keeping It Honest",
    image: "/src/assets/icons/ob4.svg",
    body: (
      <>
        Notice an incomplete or incorrectly tagged task? <strong>Rebut</strong> it by leaving a
        comment. This marks the task as <strong>Contested</strong>. The original poster can update
        their submission, which resets the task to Pending.
      </>
    ),
  },
  {
    title: "Verify And Win",
    image: "/src/assets/icons/ob5.svg",
    body: (
      <>
        Contested tasks trigger a group vote. To pass, the task needs a majority{" "}
        <strong>"Verify"</strong> vote from active group members. If no majority is reached
        within 48 hours, the task is rejected.
      </>
    ),
  },
];

const CSS = `
  @keyframes obMount {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideFromRight {
    from { opacity: 0; transform: translateX(28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideFromLeft {
    from { opacity: 0; transform: translateX(-28px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .ob-mount   { animation: obMount 0.5s cubic-bezier(0.16,1,0.3,1) both; }
  .ob-forward { animation: slideFromRight 0.32s cubic-bezier(0.16,1,0.3,1) both; }
  .ob-back    { animation: slideFromLeft  0.32s cubic-bezier(0.16,1,0.3,1) both; }
`;

const bp = {
  onMouseDown:  e => { e.currentTarget.style.transform = "scale(0.94)"; },
  onMouseUp:    e => { e.currentTarget.style.transform = "scale(1)"; },
  onTouchStart: e => { e.currentTarget.style.transform = "scale(0.94)"; },
  onTouchEnd:   e => { e.currentTarget.style.transform = "scale(1)"; },
};

export default function Onboarding() {
  const navigate = useNavigate();

  const [current, setCurrent]     = useState(0);
  const [slideKey, setSlideKey]   = useState(0);
  const [direction, setDirection] = useState("forward"); // "forward" | "back"
  const [exiting, setExiting]     = useState(false);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const changeSlide = (next, dir) => {
    setDirection(dir);
    setSlideKey(k => k + 1);
    setCurrent(next);
  };

  const goNext = () => {
    if (current < slides.length - 1) changeSlide(current + 1, "forward");
  };
  const goBack = () => {
    if (current > 0) changeSlide(current - 1, "back");
  };

  const finish = () => {
    setExiting(true);
    setTimeout(() => navigate("/home", { state: { entering: true } }), 360);
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) > 40 && dy < 60) {
      if (dx < 0) goNext();
      else goBack();
    }
    touchStartX.current = null;
  };

  const slide = slides[current];
  const isLast = current === slides.length - 1;
  const animClass = direction === "forward" ? "ob-forward" : "ob-back";

  return (
    <>
      <style>{CSS}</style>
      <div
        className="ob-mount"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          height: "100%",
          background: "var(--color-bg, #F5F3FF)",
          display: "flex",
          flexDirection: "column",
          userSelect: "none",
          transition: "opacity 0.36s ease, transform 0.36s ease",
          ...(exiting && { opacity: 0, transform: "translateY(-16px)" }),
        }}
      >
        {/* Slide content */}
        <div
          key={slideKey}
          className={animClass}
          style={{ display: "flex", flexDirection: "column", flex: 1, padding: "48px 32px 0", overflow: "hidden" }}
        >
          <h1 style={{ textAlign: "center", marginBottom: 32 }}>{slide.title}</h1>

          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
              src={slide.image}
              alt={slide.title}
              style={{ maxHeight: 260, width: "auto", objectFit: "contain" }}
            />
          </div>

          <div style={{ marginTop: 32, marginBottom: 24 }}>
            <span>{slide.body}</span>
          </div>
        </div>

        {/* Pagination dots */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, paddingBottom: 12 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              onClick={() => {
                if (i !== current) changeSlide(i, i > current ? "forward" : "back");
              }}
              style={{
                borderRadius: 99,
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                width:      i === current ? 20 : 8,
                height:     8,
                background: i === current ? "var(--color-black, #111)" : "var(--color-light-gray, #ddd)",
              }}
            />
          ))}
        </div>

        {/* Footer buttons */}
        <div style={{ padding: "0 32px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <button
            className="buttonM"
            onClick={goBack}
            disabled={current === 0}
            style={{ opacity: current === 0 ? 0.3 : 1, transition: "opacity 0.2s" }}
            {...bp}
          >
            Back
          </button>

          {/* Spacer to maintain layout balance */}
          <div style={{ width: 70 }} />

          {isLast ? (
            <button
              className="buttonM"
              onClick={finish}
              {...bp}
              style={{ background: "var(--color-primary)", color: "white", transition: "transform 0.15s" }}
            >
              Complete
            </button>
          ) : (
            <button
              className="buttonM"
              onClick={goNext}
              {...bp}
              style={{ background: "var(--color-black, #111)", color: "white", transition: "transform 0.15s" }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </>
  );
}