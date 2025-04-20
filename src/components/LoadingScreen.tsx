import { DotLottieReact } from '@lottiefiles/dotlottie-react';

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <div className="text-center flex flex-col items-center justify-center">
        <div className="text-2xl font-bold mb-6 animate-pulse text-center w-full">
          Loading Products
        </div>
        <DotLottieReact
          src="https://lottie.host/e9cb5930-293a-45b8-8db0-b0c36deb7636/rsePl0BPNl.lottie"
          loop
          autoplay
          style={{ width: 120, height: 120 }}
        />
      </div>
    </div>
  );
}

export default LoadingScreen; 