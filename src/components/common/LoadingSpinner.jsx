const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
};

export default function LoadingSpinner({ size = 'md', message }) {
  const spinnerSize = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${spinnerSize} rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin`}
        aria-label="Loading"
      />
      {message ? (
        <p className="text-lg font-semibold text-orange-600">{message}</p>
      ) : null}
    </div>
  );
}