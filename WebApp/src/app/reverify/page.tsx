import { Suspense } from 'react';
import ReverifyPageContent from './ReverifyClient';

export default function ReverifyPage() {
  return (
    <Suspense fallback={<div />}>
      <ReverifyPageContent />
    </Suspense>
  );
}