'use client';

import Link from 'next/link';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';

export default function DashboardNotFound() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* 404 Icon */}
                <div className="w-24 h-24 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700 mb-6">
                    <FileQuestion className="w-12 h-12 text-slate-500" />
                </div>

                {/* Error Message */}
                <h1 className="text-4xl font-bold text-slate-400 mb-3">404</h1>
                <h2 className="text-xl font-semibold text-white mb-4">
                    페이지를 찾을 수 없습니다
                </h2>
                <p className="text-slate-400 mb-8">
                    요청하신 페이지가 존재하지 않거나 삭제되었습니다.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        대시보드
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        뒤로 가기
                    </button>
                </div>
            </div>
        </div>
    );
}
