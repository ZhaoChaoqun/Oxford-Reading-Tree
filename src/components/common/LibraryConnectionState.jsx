import { useResource } from '../../contexts/ResourceContext';

export default function LibraryConnectionState() {
  const { isProbing, error, reprobeNow } = useResource();
  const loading = isProbing || !error;
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center">
      {loading ? (
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      ) : null}
      <p role={loading ? 'status' : 'alert'} className="text-base font-semibold text-gray-600">
        {loading ? 'Connecting to library...' : error}
      </p>
      {!loading ? (
        <button
          type="button"
          onClick={reprobeNow}
          className="rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white shadow active:scale-95"
        >
          Retry connection
        </button>
      ) : null}
    </div>
  );
}
