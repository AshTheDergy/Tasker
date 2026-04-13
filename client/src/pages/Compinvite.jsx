// PLACEHOLDER FILE, MIGHT BE DELETED OR COMPLETELY REWORKED

export default function CompInvite() {
    const competitors = [
        { rank: 1, name: "Did You See That", pts: 67 },
        { rank: 2, name: "Behh User 1000", pts: 61 },
        { rank: 3, name: "Eater 4", pts: 42 },
        { rank: 4, name: "Did You See That 2", pts: 35 },
        { rank: 5, name: "Cat", pts: 30 },
        { rank: 6, name: "Meow!", pts: 1 },
    ];

    return (
        <div className="bg-bg min-h-full flex flex-col">

            {/* Back arrow */}
            <div className="pt-[16px] px-[16px]">
                <button className="bg-transparent border-none cursor-pointer p-0 flex items-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="#0D0028" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Header */}
            <div className="text-center px-[16px] pt-[8px] pb-[4px]">
                <small className="text-dark-gray block">You've been invited to</small>
                <h1>Schoolmates</h1>
            </div>

            {/* Competitors section */}
            <div className="flex-1 px-[16px] pt-[20px]">
                <span className="nbold block mb-[12px]">Competitors</span>

                <div className="flex flex-col gap-[8px]">
                    {competitors.map((c) => (
                        <div key={c.rank} className="row">
                            {/* Rank */}
                            <span className="nbold min-w-[20px] text-center">{c.rank}</span>

                            {/* Avatar */}
                            {c.avatar?.[0]?.url ? (
                                <img
                                    src={c.avatar[0].url}
                                    className="w-[40px] h-[40px] rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-[40px] h-[40px] rounded-full bg-gray-200 flex-shrink-0" />
                            )}

                            {/* Name */}
                            <span className="flex-1 truncate">{c.name}</span>

                            {/* Points */}
                            <span className="nbold whitespace-nowrap">{c.pts} Pts</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* View Competition Tags link */}
            <div className="text-center px-[16px] pt-[20px] pb-[12px]">
                <span className="text-dark-gray underline cursor-pointer">
                    View Competition Tags
                </span>
            </div>

            {/* Bottom buttons */}
            <div className="flex gap-[12px] px-[16px] pb-[24px]">
                <button className="alt flex-1 w-auto">Decline</button>
                <button className="default flex-1 w-auto">Accept</button>
            </div>

        </div>
    );
}
