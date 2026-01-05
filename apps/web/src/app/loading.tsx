export default function Loading() {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
            <div className="text-center">
                <div className="relative">
                    {/* Spinner */}
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                    
                    {/* Glow effect */}
                    <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-blue-500/20 blur-xl"></div>
                </div>
                
                <p className="mt-6 text-slate-400 animate-pulse">로딩 중...</p>
            </div>
        </div>
    );
}
