'use client';

export default function BlobBackground() {
    // Light mode colors only
    const colors = ['rgba(63, 238, 174, 0.4)', 'rgba(100, 200, 255, 0.4)', 'rgba(255, 200, 100, 0.35)'];

    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -10 }}>
            {/* Circle 1 - Mint */}
            <div
                className="absolute w-[300px] h-[320px] animate-blob-1"
                style={{
                    background: colors[0],
                    borderRadius: '50% 50% 50% 70% / 50% 50% 70% 60%',
                    top: '-5%',
                    right: '-5%',

                    filter: 'blur(40px)',
                }}
            />

            {/* Circle 2 - Blue */}
            <div
                className="absolute w-[280px] h-[280px] animate-blob-2"
                style={{
                    background: colors[1],
                    borderRadius: '80% 30% 50% 50% / 50%',
                    top: '20%',
                    left: '-8%',

                    filter: 'blur(50px)',
                }}
            />

            {/* Circle 3 - Yellow/Orange */}
            <div
                className="absolute w-[250px] h-[260px] animate-blob-3"
                style={{
                    background: colors[2],
                    borderRadius: '40% 40% 50% 40% / 30% 50% 50% 50%',
                    bottom: '10%',
                    right: '5%',

                    filter: 'blur(45px)',
                }}
            />

            {/* Circle 4 - Extra accent for depth */}
            <div
                className="absolute w-[200px] h-[220px] animate-blob-4"
                style={{
                    background: 'rgba(180, 100, 255, 0.25)',
                    borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
                    bottom: '30%',
                    left: '10%',

                    filter: 'blur(55px)',
                }}
            />
        </div>
    );
}
