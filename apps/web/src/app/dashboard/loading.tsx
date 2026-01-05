export default function DashboardLoading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                {/* Spinner */}
                <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                <p className="mt-4 text-slate-400 animate-pulse">데이터 로딩 중...</p>
            </div>
        </div>
    );
}
