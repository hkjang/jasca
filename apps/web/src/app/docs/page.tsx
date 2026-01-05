import { redirect } from 'next/navigation';

/**
 * /docs 페이지는 현재 준비 중입니다.
 * 임시로 대시보드로 리다이렉트합니다.
 */
export default function DocsPage() {
    redirect('/dashboard');
}
