interface ConnectionState {
  status: 'connected' | 'disconnected' | 'reconnecting';
  error: string | null;
}

// Status Bar Component
function StatusBar({ status, error }: { status: ConnectionState['status']; error: string | null }) {
  return (
    <div className={`connection-status ${status} text-center mt-2`}>
      {status === 'connected' && <span className="text-green-500">🟢 Connected</span>}
      {status === 'disconnected' && <span className="text-red-500">🔴 Disconnected</span>}
      {error && <span className="text-red-500">{error}</span>}
    </div>
  );
}

interface HeaderProps {
  connectionState: ConnectionState;
}

function Header({ connectionState }: HeaderProps) {
  return (
    <header className="flex flex-col items-center gap-9">
      <div className="w-[500px] max-w-[100vw] p-4">
        <div className="flex items-center justify-center gap-4">
          <h1 className="text-4xl font-extrabold tracking-tight">Monitor Feed</h1>
          <img src="/favicon.ico" alt="Monitor Icon" className="w-6 h-6" />
        </div>
        <StatusBar status={connectionState.status} error={connectionState.error} />
      </div>
    </header>
  );
}

export default Header; 