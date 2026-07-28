type LoadErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function LoadErrorState({ message, onRetry }: LoadErrorStateProps) {
  return (
    <div
      role="alert"
      style={{
        padding: 48,
        textAlign: 'center',
        background: '#fff',
        borderRadius: 16,
        color: '#5f5142',
      }}
    >
      <h3 style={{ margin: '0 0 8px', color: '#8b2f2f', fontSize: '1rem' }}>
        Không tải được dữ liệu
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: '0.88rem' }}>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: '8px 16px',
          border: '1px solid #9A7520',
          borderRadius: 10,
          background: '#fff',
          color: '#7b5e18',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Thử lại
      </button>
    </div>
  );
}
