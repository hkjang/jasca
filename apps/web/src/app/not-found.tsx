'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* 404 Icon */}
                <div className="relative mb-8">
                    <div className="w-32 h-32 mx-auto bg-slate-800/50 rounded-full flex items-center justify-center border border-slate-700">
                        <FileQuestion className="w-16 h-16 text-slate-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-red-400 font-bold text-lg">!</span>
                    </div>
                </div>

                {/* Error Message */}
                <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 mb-4">
                    404
                </h1>
                <h2 className="text-2xl font-semibold text-white mb-4">
                    페이지를 찾을 수 없습니다
                </h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                    요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
                    <br />
                    URL을 확인하시거나 아래 링크를 이용해 주세요.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <Home className="w-5 h-5" />
                        대시보드로 이동
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        이전 페이지
                    </button>
                </div>

                {/* Quick Links */}
                <div className="mt-12 pt-8 border-t border-slate-700">
                    <p className="text-slate-500 text-sm mb-4">자주 찾는 페이지</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link
                            href="/dashboard/scans"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            스캔 목록
                        </Link>
                        <span className="text-slate-600">•</span>
                        <Link
                            href="/dashboard/vulnerabilities"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            취약점
                        </Link>
                        <span className="text-slate-600">•</span>
                        <Link
                            href="/dashboard/projects"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            프로젝트
                        </Link>
                        <span className="text-slate-600">•</span>
                        <Link
                            href="/dashboard/settings"
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            설정
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
