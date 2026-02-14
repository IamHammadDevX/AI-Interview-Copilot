'use client';

import { useGlobalShortcut } from '@/hooks/useGlobalShortcut';
import {
  Loader2,
  Mic,
  Monitor,
  MonitorPlay,
  MonitorX,
  Volume2,
  Clock,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import CaptureButton from './button/CaptureButton';
import { useAutoMode } from '@/hooks/useAutoMode';
import { useExternalStop } from '@/hooks/useExternalStop';
import { useMediaRecording } from '@/hooks/useMediaRecording';
import { useScreenCapture } from '@/hooks/useScreenCapture';
import { useScreenshot } from '@/hooks/useScreenshot';

type Props = {
  // eslint-disable-next-line no-unused-vars
  onStreamAvailable: (stream: MediaStream | null) => void;
  externalStop?: boolean;
  onExternalStopHandled?: () => void;
  // eslint-disable-next-line no-unused-vars
  handleScreenshot?: (dataUrl: string, fileName: string) => void;
};

const ScreenCapture = ({
      onStreamAvailable,
      externalStop = false,
      onExternalStopHandled,
      handleScreenshot,
  }: Props) => {
    const { videoRef, capturing, loading, startCapture, stopCapture } =
      useScreenCapture(onStreamAvailable);
  
    const { takeScreenshot } = useScreenshot(
      videoRef,
      capturing,
      loading,
      handleScreenshot
    );
  
    const { autoMode, countdown, toggleAutoMode, resetAutoMode } = useAutoMode(
      capturing,
      takeScreenshot
    );
  
    const { stopRecording } = useMediaRecording();

    useExternalStop(
      externalStop,
      capturing,
      () => {
        stopCapture();
        stopRecording();
        resetAutoMode();
      },
      onExternalStopHandled
    );

    const handleStartCapture = async () => {
      await startCapture();
    };

    const handleStopCapture = () => {
      stopCapture();
      stopRecording();
      resetAutoMode();
    };

    useGlobalShortcut('KeyX', takeScreenshot, capturing && !loading);

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-base-100/70 backdrop-blur rounded-3xl border border-base-300 overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-contain rounded-xl transition-opacity duration-300 ${
            capturing ? 'opacity-100' : 'opacity-0 absolute'
          }`}
          muted
          playsInline
        />

        {!capturing && (
          <div className="flex flex-col items-center justify-center space-y-2 lg:space-y-6 text-center p-8 pb-20 transition-opacity duration-300">
            <div className="relative">
              <div className="w-10 h-10 lg:w-20 lg:h-20 bg-gradient-to-br from-[#FF6B00] to-[#FFA63D] rounded-2xl flex items-center justify-center shadow-lg">
                <Monitor className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
              </div>
              {loading && (
                <div className="absolute inset-0 bg-[#E85F00] rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-base-content">
                {loading ? 'Connecting...' : 'Ready to Capture'}
              </h3>
              <p className="opacity-70 max-w-md text-sm leading-relaxed">
                {loading
                  ? 'Setting up your screen share and microphone...'
                  : 'Share your screen and start capturing high-quality video with synchronized audio from your microphone.'}
              </p>
            </div>

            {!loading && (
              <div className="flex items-center space-x-6 text-xs lg:text-sm opacity-70">
                <div className="flex items-center space-x-2">
                  <Monitor className="w-4 h-4" />
                  <span>Screen Share</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mic className="w-4 h-4" />
                  <span>Microphone</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Volume2 className="w-4 h-4" />
                  <span>System Audio</span>
                </div>
              </div>
            )}
          </div>
        )}

        {capturing && (
          <div className="absolute top-2 left-24 transform -translate-x-1/2">
            <div className="group relative">
              <button
                onClick={toggleAutoMode}
                className={`flex items-center cursor-pointer space-x-2 px-2 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-xl hover:shadow-xl ${
                  autoMode
                    ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] hover:from-[#E85F00] hover:to-[#FF8A2A] text-white'
                }`}
              >
                {autoMode ? (
                  <ToggleRight className="w-6 h-6" />
                ) : (
                  <ToggleLeft className="w-6 h-6" />
                )}
                <span>Auto Mode</span>
                {autoMode && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-mono">{countdown}s</span>
                  </div>
                )}
              </button>

              {!autoMode && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-2 bg-base-100/95 backdrop-blur text-base-content text-xs rounded-2xl border border-base-300 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal break-words max-w-52 w-full z-10">
                  Enable automatic screenshots every minute. So if your coding
                  task has focus detection, you can always keep it on the needed
                  screen
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-base-100"></div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="absolute top-2 right-4">
          <button
            className={`group relative cursor-pointer px-3 py-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
              capturing
                ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                : loading
                ? 'hidden'
                : 'hidden'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (!loading && capturing) {
                handleStopCapture();
              }
            }}
            disabled={loading}
          >
            <div className="flex items-center space-x-2">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : capturing ? (
                <MonitorX className="w-5 h-5" />
              ) : (
                <MonitorPlay className="w-5 h-5" />
              )}
              <span>
                {loading
                  ? 'Connecting...'
                  : capturing
                  ? 'Stop Capture'
                  : 'Start Capture'}
              </span>
            </div>

            {!capturing && !loading && (
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FFA63D] opacity-0 group-hover:opacity-15 transition-opacity duration-200"></div>
            )}
          </button>
        </div>

        <div className="absolute bottom-4 right-4">
          <CaptureButton
            capturing={capturing}
            loading={loading}
            onStartCapture={handleStartCapture}
            onTakeScreenshot={takeScreenshot}
          />
        </div>
      </div>
    );
  }

ScreenCapture.displayName = 'ScreenCapture';

export default ScreenCapture;
