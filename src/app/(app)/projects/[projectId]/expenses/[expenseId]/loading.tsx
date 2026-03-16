import { Spinner } from '@/components/ui/spinner';

export default function ExpenseDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <Spinner />
    </div>
  );
}
